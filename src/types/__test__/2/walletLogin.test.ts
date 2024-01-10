import type { Connections } from 'definitions'

import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts'

import { SIGNING_MESSAGE_PURPOSE } from 'common/enums'

import { testClient, genConnections, closeConnections } from '../utils'

jest.mock('common/utils', () => ({
  __esModule: true,
  ...jest.requireActual('common/utils'),
  getAlchemyProvider: () => ({ getCode: jest.fn(() => '0x') }),
}))

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('walletLogin', () => {
  const GENERATE_SIGNING_MESSAGE = /* GraphQL */ `
    mutation ($input: GenerateSigningMessageInput!) {
      generateSigningMessage(input: $input) {
        nonce
        purpose
        signingMessage
        createdAt
        expiredAt
      }
    }
  `
  const WALLET_LOGIN = /* GraphQL */ `
    mutation ($input: WalletLoginInput!) {
      walletLogin(input: $input) {
        auth
        token
        type
        user {
          userName
          info {
            ethAddress
          }
        }
      }
    }
  `

  test('wallet signup/login', async () => {
    const testWalletLoginPurpose = async (
      purpose: keyof typeof SIGNING_MESSAGE_PURPOSE
    ) => {
      const account = privateKeyToAccount(generatePrivateKey())
      const server = await testClient({ connections })
      // signup
      const {
        data: {
          generateSigningMessage: { nonce, signingMessage },
        },
      } = await server.executeOperation({
        query: GENERATE_SIGNING_MESSAGE,
        variables: {
          input: {
            address: account.address,
            purpose,
          },
        },
      })
      const signature = await account.signMessage({
        message: signingMessage,
      })
      const { data } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: account.address,
            signedMessage: signingMessage,
            signature,
            nonce,
          },
        },
      })
      expect(data?.walletLogin.auth).toBe(true)
      expect(data?.walletLogin.token).toBeDefined()
      expect(data?.walletLogin.type).toBe('Signup')
      expect(data?.walletLogin.user.userName).toBe(null)
      expect(data?.walletLogin.user.info.ethAddress).toBe(
        account?.address.toLowerCase()
      )
      // login
      const {
        data: {
          generateSigningMessage: {
            nonce: loginNonce,
            signingMessage: loginSigningMessage,
          },
        },
      } = await server.executeOperation({
        query: GENERATE_SIGNING_MESSAGE,
        variables: {
          input: {
            address: account.address,
            purpose,
          },
        },
      })
      const loginSignature = await account.signMessage({
        message: loginSigningMessage,
      })
      const { data: loginData } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: account.address,
            signedMessage: loginSigningMessage,
            signature: loginSignature,
            nonce: loginNonce,
          },
        },
      })
      expect(loginData?.walletLogin.auth).toBe(true)
      expect(loginData?.walletLogin.token).toBeDefined()
      expect(loginData?.walletLogin.type).toBe('Login')
      expect(loginData?.walletLogin.user.userName).toBe(null)
      expect(loginData?.walletLogin.user.info.ethAddress).toBe(
        account?.address.toLowerCase()
      )
    }

    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.signup)
    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.login)
  }, 100000)

  test('wallet login with wrong purpose will throw errors', async () => {
    const account = privateKeyToAccount(generatePrivateKey())
    const server = await testClient({ connections })
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: account.address,
          purpose: SIGNING_MESSAGE_PURPOSE.airdrop,
        },
      },
    })
    const signature = await account.signMessage({
      message: signingMessage,
    })
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: account.address,
          signedMessage: signingMessage,
          signature,
          nonce,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('wallet login with wrong nonce will throw errors', async () => {
    const account = privateKeyToAccount(generatePrivateKey())
    const server = await testClient({ connections })
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: account.address,
          purpose: SIGNING_MESSAGE_PURPOSE.signup,
        },
      },
    })
    const signature = await account.signMessage({
      message: signingMessage,
    })
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: account.address,
          signedMessage: signingMessage,
          signature,
          nonce: nonce + 'wrong',
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})

import type { Connections } from 'definitions'

import { Wallet } from 'ethers'

import { SIGNING_MESSAGE_PURPOSE } from 'common/enums'

import { testClient, genConnections, closeConnections } from '../utils'

jest.mock('common/utils', () => ({
  __esModule: true,
  ...jest.requireActual('common/utils'),
  getAlchemyProvider: () => ({ getCode: jest.fn(() => '0x') }),
}))

declare global {
  // eslint-disable-next-line no-var
  var connections: Connections
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
  globalThis.connections = connections
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
      const wallet = Wallet.createRandom()
      const server = await testClient()
      // signup
      const {
        data: {
          generateSigningMessage: { nonce, signingMessage },
        },
      } = await server.executeOperation({
        query: GENERATE_SIGNING_MESSAGE,
        variables: {
          input: {
            address: wallet.address,
            purpose,
          },
        },
      })
      const signature = await wallet.signMessage(signingMessage)
      const { data } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: wallet.address,
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
        wallet.address.toLowerCase()
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
            address: wallet.address,
            purpose,
          },
        },
      })
      const loginSignature = await wallet.signMessage(loginSigningMessage)
      const { data: loginData } = await server.executeOperation({
        query: WALLET_LOGIN,
        variables: {
          input: {
            ethAddress: wallet.address,
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
        wallet.address.toLowerCase()
      )
    }

    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.signup)
    await testWalletLoginPurpose(SIGNING_MESSAGE_PURPOSE.login)
  }, 100000)
  test('wallet login with wrong purpose will throw errors', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.airdrop,
        },
      },
    })
    const signature = await wallet.signMessage(signingMessage)
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
  test('wallet login with wrong nonce will throw errors', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.signup,
        },
      },
    })
    const signature = await wallet.signMessage(signingMessage)
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce: nonce + 'wrong',
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
  test('wallet login check nonce in signature', async () => {
    const wallet = Wallet.createRandom()
    const server = await testClient()
    const {
      data: {
        generateSigningMessage: { nonce: nonce, signingMessage },
      },
    } = await server.executeOperation({
      query: GENERATE_SIGNING_MESSAGE,
      variables: {
        input: {
          address: wallet.address,
          purpose: SIGNING_MESSAGE_PURPOSE.signup,
        },
      },
    })
    const signature = await wallet.signMessage(
      signingMessage.replace(nonce, 'wrongnonce')
    )
    const { errors } = await server.executeOperation({
      query: WALLET_LOGIN,
      variables: {
        input: {
          ethAddress: wallet.address,
          signedMessage: signingMessage,
          signature,
          nonce: nonce,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})

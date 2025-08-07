import type { Connections } from '#definitions/index.js'

import { AtomService } from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

const GET_USER_CRYPTO_WALLET = /* GraphQL */ `
  query GetUserCryptoWallet($input: UserInput!) {
    user(input: $input) {
      id
      info {
        cryptoWallet {
          id
          address
          nfts {
            id
          }
          hasNFTs
        }
      }
    }
  }
`

describe('cryptoWallet resolver', () => {
  let connections: Connections
  let atomService: AtomService

  beforeAll(async () => {
    connections = await genConnections()
    atomService = new AtomService(connections)
  }, 30000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  beforeEach(async () => {
    // Clean up previous test data
    await atomService.deleteMany({ table: 'crypto_wallet' })
  })

  describe('when user has ethAddress', () => {
    test('should return crypto wallet with ethAddress', async () => {
      const server = await testClient({ connections })
      // from db/seeds/01_users.js
      const ethAddress = '0x999999cf1046e68e36e1aa2e0e07105eddd1f08e'

      const { data, errors } = await server.executeOperation({
        query: GET_USER_CRYPTO_WALLET,
        variables: {
          input: { ethAddress },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.user.info.cryptoWallet).toBeDefined()
      expect(data?.user.info.cryptoWallet.address).toBe(ethAddress)
    })
  })

  describe('when user has no crypto wallet', () => {
    test('should return null when no wallet exists', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_USER_CRYPTO_WALLET,
        variables: {
          input: { userName: 'test4' }, // Using seed user
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.user.info.cryptoWallet).toBeNull()
    })
  })
})

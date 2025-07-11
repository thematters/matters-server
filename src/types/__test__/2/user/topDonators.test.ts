import type { Connections } from '#definitions/index.js'

import { PaymentService } from '#connectors/index.js'
import { createDonationTx } from '#connectors/__test__/utils.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let paymentService: PaymentService

beforeAll(async () => {
  connections = await genConnections()
  paymentService = new PaymentService(connections)
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_VIEWER_TOPDONATORS = /* GraphQL */ `
  query ($input: TopDonatorInput!) {
    viewer {
      analytics {
        topDonators(input: $input) {
          edges {
            node {
              ... on User {
                userName
              }
              ... on CryptoWallet {
                address
              }
            }
            donationCount
          }
          totalCount
        }
      }
    }
  }
`

describe('user query fields', () => {
  test('retrive topDonators by visitor', async () => {
    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    expect(errors).toBeUndefined()
    const donators = data.viewer.analytics.topDonators
    expect(donators).toEqual({ edges: [], totalCount: 0 })
  })

  test('retrive topDonators by user', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const recipientId = '1'
    // test no donators
    const res1 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators1 = res1.data?.viewer?.analytics?.topDonators
    expect(donators1).toEqual({ edges: [], totalCount: 0 })

    // test having donators
    await createDonationTx({ recipientId, senderId: '2' }, paymentService)
    const res2 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: {} },
    })
    const donators2 = res2.data?.viewer?.analytics?.topDonators
    expect(donators2).toEqual({
      edges: [{ node: { userName: 'test2' }, donationCount: 1 }],
      totalCount: 1,
    })

    // test pagination
    await createDonationTx({ recipientId, senderId: '3' }, paymentService)
    const res3 = await server.executeOperation({
      query: GET_VIEWER_TOPDONATORS,
      variables: { input: { first: 1 } },
    })
    const donators3 = res3.data?.viewer?.analytics?.topDonators
    expect(donators3).toEqual({
      edges: [{ node: { userName: 'test3' }, donationCount: 1 }],
      totalCount: 2,
    })
  })
})

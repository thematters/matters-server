import type { Connections } from '#definitions/index.js'

import { MATERIALIZED_VIEW, NODE_TYPES } from '#common/enums/index.js'
import { refreshView } from '#connectors/__test__/utils.js'
import { ChannelService } from '#connectors/index.js'
import { toGlobalId } from '#common/utils/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let channelService: ChannelService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const GET_AUTHOR_RECOMMENDATION = /* GraphQL */ `
  query ($input: RecommendInput!) {
    viewer {
      recommendation {
        authors(input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  }
`

describe('authors', () => {
  test('old algo', async () => {
    await refreshView(
      MATERIALIZED_VIEW.user_reader_materialized,
      connections.knex
    )

    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION,
      variables: { input: { first: 1 } },
    })
    expect(errors).toBeUndefined()
  })
  test('new algo', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION,
      variables: { input: { first: 1, newAlgo: true } },
    })
    expect(errors).toBeUndefined()
  })
  test('new algo with channel', async () => {
    const channel = await channelService.createTopicChannel({
      name: 'test-channel',
      providerId: 'test-provider-id',
      enabled: true,
    })
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION,
      variables: {
        input: {
          first: 1,
          newAlgo: true,
          filter: { channel: { shortHash: channel.shortHash } },
        },
      },
    })
    expect(errors).toBeUndefined()
    const { errors: errors2 } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION,
      variables: {
        input: {
          first: 1,
          newAlgo: true,
          filter: {
            channel: {
              id: toGlobalId({ type: NODE_TYPES.TopicChannel, id: channel.id }),
            },
          },
        },
      },
    })
    expect(errors2).toBeUndefined()
  })
})

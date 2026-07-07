import type { Connections } from '#definitions/index.js'

import {
  CACHE_PREFIX,
  MATERIALIZED_VIEW,
  NODE_TYPES,
  USER_STATE,
} from '#common/enums/index.js'
import { refreshView } from '#connectors/__test__/utils.js'
import { AtomService, Cache, ChannelService } from '#connectors/index.js'
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

  test('state-restricted authors are excluded at read time even when cached', async () => {
    const atomService = new AtomService(connections)
    // two non-viewer authors from seeds, forced to a known baseline state
    const [activeAuthor, toFreezeAuthor] = await atomService.findMany({
      table: 'user',
      whereIn: ['id', ['2', '3']],
      orderBy: [{ column: 'id', order: 'asc' }],
    })
    for (const { id } of [activeAuthor, toFreezeAuthor]) {
      await atomService.update({
        table: 'user',
        where: { id },
        data: { state: USER_STATE.active },
      })
    }
    const cache = new Cache(
      CACHE_PREFIX.RECOMMENDATION_AUTHORS,
      connections.objectCacheRedis
    )
    // simulate a pool cached before the freeze happened
    await cache.storeObject({
      keys: { type: 'recommendationAuthors', args: { channelId: undefined } },
      data: [{ authorId: activeAuthor.id }, { authorId: toFreezeAuthor.id }],
      expire: 60,
    })
    await atomService.update({
      table: 'user',
      where: { id: toFreezeAuthor.id },
      data: { state: USER_STATE.frozen },
    })

    const server = await testClient({ isAuth: true, connections })
    const { errors, data } = await server.executeOperation({
      query: GET_AUTHOR_RECOMMENDATION,
      variables: { input: { first: 5 } },
    })
    expect(errors).toBeUndefined()
    const ids = data.viewer.recommendation.authors.edges.map(
      ({ node }: { node: { id: string } }) => node.id
    )
    expect(ids).toContain(
      toGlobalId({ type: NODE_TYPES.User, id: activeAuthor.id })
    )
    expect(ids).not.toContain(
      toGlobalId({ type: NODE_TYPES.User, id: toFreezeAuthor.id })
    )

    await atomService.update({
      table: 'user',
      where: { id: toFreezeAuthor.id },
      data: { state: USER_STATE.active },
    })
  })

  test('freezing a user purges recommendation authors and tags caches', async () => {
    const atomService = new AtomService(connections)
    const target = await atomService.findUnique({
      table: 'user',
      where: { id: '3' },
    })
    await atomService.update({
      table: 'user',
      where: { id: target.id },
      data: { state: USER_STATE.active },
    })
    const authorsCache = new Cache(
      CACHE_PREFIX.RECOMMENDATION_AUTHORS,
      connections.objectCacheRedis
    )
    const tagsCache = new Cache(
      CACHE_PREFIX.RECOMMENDATION_TAGS,
      connections.objectCacheRedis
    )
    const authorsSitewideKey = authorsCache.genKey({
      type: 'recommendationAuthors',
      args: { channelId: undefined },
    })
    const tagsSitewideKey = tagsCache.genKey({
      type: 'recommendationTags',
      args: { channelId: undefined },
    })
    await authorsCache.storeObject({
      keys: { type: 'recommendationAuthors', args: { channelId: undefined } },
      data: [{ authorId: target.id }],
      expire: 60,
    })
    await tagsCache.storeObject({
      keys: { type: 'recommendationTags', args: { channelId: undefined } },
      data: [{ tagId: '1' }],
      expire: 60,
    })

    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const UPDATE_USER_STATE = /* GraphQL */ `
      mutation ($input: UpdateUserStateInput!) {
        updateUserState(input: $input) {
          id
          status {
            state
          }
        }
      }
    `
    const { errors } = await server.executeOperation({
      query: UPDATE_USER_STATE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.User, id: target.id }),
          state: 'frozen',
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(
      await connections.objectCacheRedis.get(authorsSitewideKey)
    ).toBeNull()
    expect(await connections.objectCacheRedis.get(tagsSitewideKey)).toBeNull()

    await atomService.update({
      table: 'user',
      where: { id: target.id },
      data: { state: USER_STATE.active },
    })
  })
})

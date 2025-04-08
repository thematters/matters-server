import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import { ChannelService, AtomService } from '#connectors/index.js'

let connections: Connections
let channelService: ChannelService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  channelService = new ChannelService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('togglePinChannelArticles', () => {
  const TOGGLE_PIN_CHANNEL_ARTICLES = /* GraphQL */ `
    mutation TogglePinChannelArticles($input: TogglePinChannelArticlesInput!) {
      togglePinChannelArticles(input: $input) {
        id
        ... on TopicChannel {
          articles(input: { first: 10 }) {
            edges {
              pinned
              node {
                id
              }
            }
          }
        }
        ... on CurationChannel {
          articles(input: { first: 10 }) {
            edges {
              pinned
              node {
                id
              }
            }
          }
        }
      }
    }
  `

  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'curation_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })
    await atomService.deleteMany({ table: 'curation_channel' })
  })

  describe('Topic Channel', () => {
    test('pins articles within limit', async () => {
      // Create test channel and articles
      const channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      const articles = ['1', '2', '3'].map((id) => ({
        articleId: id,
        channelId: channel.id,
        enabled: true,
      }))

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'topic_channel_article',
            data: article,
          })
        )
      )

      // Execute mutation
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({
              type: NODE_TYPES.TopicChannel,
              id: channel.id,
            }),
            articles: articles.map((a) =>
              toGlobalId({ type: NODE_TYPES.Article, id: a.articleId })
            ),
            pinned: true,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.togglePinChannelArticles.articles.edges).toHaveLength(3)
      expect(
        data?.togglePinChannelArticles.articles.edges.every(
          (e: { pinned: boolean }) => e.pinned
        )
      ).toBe(true)
    })
  })

  describe('Curation Channel', () => {
    test('pins articles within custom limit', async () => {
      // Create test channel with pinAmount = 3
      const channel = await channelService.createCurationChannel({
        name: 'test-curation',
        pinAmount: 3,
      })

      const articles = ['1', '2'].map((id) => ({
        articleId: id,
        channelId: channel.id,
      }))

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'curation_channel_article',
            data: article,
          })
        )
      )

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({
              type: NODE_TYPES.CurationChannel,
              id: channel.id,
            }),
            articles: articles.map((a) =>
              toGlobalId({ type: NODE_TYPES.Article, id: a.articleId })
            ),
            pinned: true,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.togglePinChannelArticles.articles.edges).toHaveLength(2)
      expect(
        data?.togglePinChannelArticles.articles.edges.every(
          (e: { pinned: boolean }) => e.pinned
        )
      ).toBe(true)
    })
  })

  describe('Authorization and Validation', () => {
    test('throws error for unauthorized user', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: false,
      })

      const { errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({ type: NODE_TYPES.TopicChannel, id: '1' }),
            articles: [toGlobalId({ type: NODE_TYPES.Article, id: '1' })],
            pinned: true,
          },
        },
      })

      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('throws error for invalid channel type', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({ type: NODE_TYPES.User, id: '1' }),
            articles: [toGlobalId({ type: NODE_TYPES.Article, id: '1' })],
            pinned: true,
          },
        },
      })

      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })

    test('throws error for invalid article type', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({ type: NODE_TYPES.TopicChannel, id: '1' }),
            articles: [toGlobalId({ type: NODE_TYPES.User, id: '1' })],
            pinned: true,
          },
        },
      })

      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })
  })

  describe('Unpinning', () => {
    test('successfully unpins articles', async () => {
      // Create channel and pinned articles
      const channel = await channelService.createCurationChannel({
        name: 'test-curation',
        pinAmount: 3,
      })

      const articles = ['1', '2'].map((id) => ({
        articleId: id,
        channelId: channel.id,
        pinned: true,
        pinnedAt: new Date(),
      }))

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'curation_channel_article',
            data: article,
          })
        )
      )

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({
              type: NODE_TYPES.CurationChannel,
              id: channel.id,
            }),
            articles: articles.map((a) =>
              toGlobalId({ type: NODE_TYPES.Article, id: a.articleId })
            ),
            pinned: false,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.togglePinChannelArticles.articles.edges).toHaveLength(2)
      expect(
        data?.togglePinChannelArticles.articles.edges.every(
          (e: { pinned: boolean }) => !e.pinned
        )
      ).toBe(true)
    })

    test('allows unpinning even when over limit', async () => {
      // Create channel with pinned articles
      const channel = await channelService.createCurationChannel({
        name: 'test-curation',
        pinAmount: 1, // Set low limit
      })

      const articles = ['1', '2'].map((id) => ({
        articleId: id,
        channelId: channel.id,
        pinned: true,
        pinnedAt: new Date(),
      }))

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'curation_channel_article',
            data: article,
          })
        )
      )

      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: TOGGLE_PIN_CHANNEL_ARTICLES,
        variables: {
          input: {
            channel: toGlobalId({
              type: NODE_TYPES.CurationChannel,
              id: channel.id,
            }),
            articles: articles.map((a) =>
              toGlobalId({ type: NODE_TYPES.Article, id: a.articleId })
            ),
            pinned: false,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.togglePinChannelArticles.articles.edges).toHaveLength(2)
      expect(
        data?.togglePinChannelArticles.articles.edges.every(
          (e: { pinned: boolean }) => !e.pinned
        )
      ).toBe(true)
    })
  })
})

import type {
  Connections,
  TopicChannel,
  CurationChannel,
  Article,
} from '#definitions/index.js'

import { NODE_TYPES, CURATION_CHANNEL_STATE } from '#common/enums/index.js'
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

const GET_CHANNEL_ARTICLES = /* GraphQL */ `
  query GetChannelArticles(
    $channelInput: ChannelInput!
    $articleInput: ChannelArticlesInput!
  ) {
    channel(input: $channelInput) {
      ... on TopicChannel {
        articles(input: $articleInput) {
          edges {
            pinned
            node {
              id
            }
          }
        }
      }
      ... on CurationChannel {
        articles(input: $articleInput) {
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

describe('TopicChannel.articles', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'topic_channel_article' })
    await atomService.deleteMany({ table: 'topic_channel' })
  })

  describe('datetimeRange filtering', () => {
    let channel: TopicChannel
    let articles: Article[]
    const baseTime = new Date('2024-01-01T00:00:00Z')
    const oneDayBefore = new Date(baseTime.getTime() - 86400000)
    const oneDayAfter = new Date(baseTime.getTime() + 86400000)
    const twoDaysAfter = new Date(baseTime.getTime() + 172800000)

    beforeEach(async () => {
      channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
      })

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'topic_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              enabled: true,
            },
          })
        )
      )

      await Promise.all([
        atomService.update({
          table: 'article',
          where: { id: articles[0].id },
          data: { createdAt: oneDayBefore }, // 1 day before
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[1].id },
          data: { createdAt: baseTime }, // exactly at start
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[2].id },
          data: { createdAt: oneDayAfter }, // 1 day after
        }),
        atomService.update({
          table: 'article',
          where: { id: articles[3].id },
          data: { createdAt: twoDaysAfter }, // 2 days after
        }),
      ])
    })

    test('filters articles within date range', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)

      const { data: filteredData } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              datetimeRange: { start: oneDayBefore, end: oneDayAfter },
            },
          },
        },
      })

      expect(filteredData?.channel.articles.edges).toHaveLength(3)
      expect(
        filteredData?.channel.articles.edges.map((e: any) => e.node.id)
      ).toEqual(
        expect.arrayContaining([
          toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[1].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id }),
        ])
      )
    })

    test('filters articles with only start date', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              datetimeRange: { start: oneDayBefore },
            },
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
      expect(data?.channel.articles.edges.map((e: any) => e.node.id)).toEqual(
        expect.arrayContaining([
          toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[1].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[2].id }),
          toGlobalId({ type: NODE_TYPES.Article, id: articles[3].id }),
        ])
      )
    })
  })

  describe('search filtering', () => {
    let channel: TopicChannel
    let articles: Article[]

    beforeEach(async () => {
      channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 10,
      })

      // Create channel articles
      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'topic_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              enabled: true,
            },
          })
        )
      )
    })

    test('search by article title', async () => {
      const server = await testClient({ connections })

      // Test article title search (now searches both articles and users)
      const { errors: errors1, data: data1 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: 'test article 1',
            },
          },
        },
      })
      expect(errors1).toBeUndefined()
      expect(data1?.channel.articles.edges.length).toBeGreaterThan(0)

      // Test non-existent article title (searches both articles and users)
      const { errors: errors2, data: data2 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: 'non existent article title',
            },
          },
        },
      })
      expect(errors2).toBeUndefined()
      expect(data2?.channel.articles.edges.length).toBe(0)
    })

    test('search by username', async () => {
      const server = await testClient({ connections })

      // Test user search with @username (now searches both articles and users)
      const { errors: errors1, data: data1 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: '@test1',
            },
          },
        },
      })
      expect(errors1).toBeUndefined()
      expect(data1?.channel.articles.edges.length).toBeGreaterThan(0)

      // Test non-existent username (searches both articles and users)
      const { errors: errors2, data: data2 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: '@nonexistentuser',
            },
          },
        },
      })
      expect(errors2).toBeUndefined()
      expect(data2?.channel.articles.edges.length).toBe(0)
    })

    test('search with empty or whitespace input', async () => {
      const server = await testClient({ connections })

      // Test search with empty string (searches both articles and users)
      const { errors: errors1, data: data1 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: '',
            },
          },
        },
      })
      expect(errors1).toBeUndefined()
      expect(data1?.channel.articles.edges.length).toBeGreaterThan(0)

      // Test search with whitespace (searches both articles and users)
      const { errors: errors2, data: data2 } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: '   ',
            },
          },
        },
      })
      expect(errors2).toBeUndefined()
      expect(data2?.channel.articles.edges.length).toBeGreaterThan(0)
    })

    test('search with combined article and user results', async () => {
      const server = await testClient({ connections })

      // Test search with a term that could match both articles and users
      const { errors, data } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            filter: {
              searchKey: 'test',
            },
          },
        },
      })
      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges.length).toBeGreaterThan(0)
    })
  })

  describe('sorting', () => {
    let channel: TopicChannel
    let articles: Article[]

    beforeEach(async () => {
      channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
        orderBy: [
          {
            column: 'createdAt',
            order: 'asc',
          },
        ],
      })

      // Create channel articles with different creation times
      await Promise.all(
        articles.map((article, index) =>
          atomService.create({
            table: 'topic_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              enabled: true,
              createdAt: new Date(2024, 0, index + 1), // Jan 1, 2, 3, 4
            },
          })
        )
      )
      await atomService.update({
        table: 'topic_channel',
        where: { id: channel.id },
        data: { pinnedArticles: [articles[0].id] },
      })
    })

    test('default sorting returns articles in ascending order', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
      // Should be in order by 'order' column ascending
      expect(data?.channel.articles.edges[0].node.id).toBe(
        toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id })
      )
    })

    test('newest sort returns articles in descending order by createdAt', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            sort: 'newest',
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
      // Should be in newest to oldest order by createdAt
      expect(data?.channel.articles.edges[0].node.id).toBe(
        toGlobalId({ type: NODE_TYPES.Article, id: articles[3].id })
      )
    })

    test('non-admin cannot use admin-only sorting options', async () => {
      const server = await testClient({ connections, isAuth: true })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            sort: 'mostAppreciations',
          },
        },
      })

      // Verify that non-admin users get a FORBIDDEN error when trying to use admin-only sorting
      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('admin can use admin-only sorting options', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            sort: 'mostAppreciations',
          },
        },
      })

      expect(errors).toBeUndefined()
    })
  })

  describe('oss parameter', () => {
    let channel: TopicChannel
    let articles: Article[]

    beforeEach(async () => {
      channel = await channelService.createTopicChannel({
        name: 'test-topic',
        providerId: 'test-provider-id',
        enabled: true,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
      })

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'topic_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              enabled: true,
              pinned: false,
            },
          })
        )
      )
    })

    test('non-admin cannot use oss parameter', async () => {
      const server = await testClient({ connections, isAuth: true })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            oss: true,
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('admin can use oss parameter', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            oss: true,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
    })
  })
})

describe('CurationChannel.articles', () => {
  beforeEach(async () => {
    await atomService.deleteMany({ table: 'curation_channel_article' })
    await atomService.deleteMany({ table: 'curation_channel' })
  })

  describe('sorting', () => {
    let channel: CurationChannel
    let articles: Article[]

    beforeEach(async () => {
      channel = await channelService.createCurationChannel({
        name: 'test-curation',
        state: CURATION_CHANNEL_STATE.published,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
      })

      // Create channel articles with different creation times
      await Promise.all(
        articles.map((article, index) =>
          atomService.create({
            table: 'curation_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              pinned: false,
            },
          })
        )
      )
      await atomService.update({
        table: 'curation_channel_article',
        where: { articleId: articles[0].id, channelId: channel.id },
        data: { pinned: true },
      })
    })

    test('default sorting returns articles in ascending order', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
      // Should be in newest to oldest order
      expect(data?.channel.articles.edges[0].node.id).toBe(
        toGlobalId({ type: NODE_TYPES.Article, id: articles[0].id })
      )
    })

    test('non-admin cannot use admin-only sorting options', async () => {
      const server = await testClient({ connections, isAuth: true })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            sort: 'mostAppreciations',
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('admin can use admin-only sorting options', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            sort: 'mostAppreciations',
          },
        },
      })

      expect(errors).toBeUndefined()
    })
  })

  describe('oss parameter', () => {
    let channel: CurationChannel
    let articles: Article[]

    beforeEach(async () => {
      channel = await channelService.createCurationChannel({
        name: 'test-curation',
        state: CURATION_CHANNEL_STATE.published,
      })

      articles = await atomService.findMany({
        table: 'article',
        where: {},
        take: 4,
      })

      await Promise.all(
        articles.map((article) =>
          atomService.create({
            table: 'curation_channel_article',
            data: {
              articleId: article.id,
              channelId: channel.id,
              pinned: false,
            },
          })
        )
      )
    })

    test('non-admin cannot use oss parameter', async () => {
      const server = await testClient({ connections, isAuth: true })

      const { errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            oss: true,
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('admin can use oss parameter', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
        isAdmin: true,
      })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
            oss: true,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
    })

    test('oss parameter defaults to false', async () => {
      const server = await testClient({ connections })

      const { data, errors } = await server.executeOperation({
        query: GET_CHANNEL_ARTICLES,
        variables: {
          channelInput: {
            shortHash: channel.shortHash,
          },
          articleInput: {
            first: 10,
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.channel.articles.edges).toHaveLength(4)
    })
  })
})

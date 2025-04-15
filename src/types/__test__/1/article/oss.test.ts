import type { Connections } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { ChannelService, AtomService } from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let atomService: AtomService
let channelService: ChannelService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  channelService = new ChannelService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('query oss articles', () => {
  const GET_OSS_ARTICLES = /* GraphQL */ `
    query ($input: OSSArticlesInput!) {
      oss {
        articles(input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `
  test('query oss articles with channel filter', async () => {
    // Create a topic channel
    const channel = await channelService.createTopicChannel({
      name: 'test-channel',
      enabled: true,
      providerId: 'test-provider',
    })

    // Add article to channel
    await atomService.create({
      table: 'topic_channel_article',
      data: {
        channelId: channel.id,
        articleId: '1',
        enabled: true,
      },
    })

    const adminServer = await testClient({ connections, isAdmin: true })
    const { errors, data } = await adminServer.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            channel: toGlobalId({
              type: NODE_TYPES.TopicChannel,
              id: channel.id,
            }),
          },
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.oss.articles.edges.length).toBe(1)
  })

  test('query oss articles with invalid channel type', async () => {
    const adminServer = await testClient({ connections, isAdmin: true })
    const { errors, data } = await adminServer.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            channel: toGlobalId({ type: NODE_TYPES.Article, id: '1' }),
          },
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.oss.articles.edges.length).toBe(0)
  })
  test('query spams', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { filter: { isSpam: true } } },
    })
    expect(data.oss.articles.edges.length).toBe(0)
  })
  test('query all articles', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: {} },
    })
    expect(data.oss.articles.edges.length).toBeGreaterThan(1)
  })

  describe('query article oss', () => {
    const GET_ARTICLE_OSS = /* GraphQL */ `
      query ($input: ArticleInput!) {
        article(input: $input) {
          id
          oss {
            boost
            score
            inRecommendIcymi
            inRecommendHottest
            inRecommendNewest
            inSearch
            spamStatus {
              score
              isSpam
            }
          }
        }
      }
    `
    test('only admin can view oss info', async () => {
      const article = await atomService.findUnique({
        table: 'article',
        where: { id: '1' },
      })
      const anonymousServer = await testClient({ connections })
      const { errors } = await anonymousServer.executeOperation({
        query: GET_ARTICLE_OSS,
        variables: {
          input: {
            shortHash: article.shortHash,
          },
        },
      })
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
      const adminServer = await testClient({ connections, isAdmin: true })
      const { errors: errorsAdmin, data } = await adminServer.executeOperation({
        query: GET_ARTICLE_OSS,
        variables: {
          input: {
            shortHash: article.shortHash,
          },
        },
      })
      expect(errorsAdmin).toBeUndefined()
      expect(data.article.oss).toBeDefined()
      expect(data.article.oss.boost).toBeDefined()
      expect(data.article.oss.score).toBeDefined()
      expect(data.article.oss.inRecommendIcymi).toBeDefined()
      expect(data.article.oss.inRecommendHottest).toBeDefined()
      expect(data.article.oss.inRecommendNewest).toBeDefined()
      expect(data.article.oss.inSearch).toBeDefined()
      expect(data.article.oss.spamStatus).toBeDefined()
      expect(data.article.oss.spamStatus.score).toBeDefined()
      expect(data.article.oss.spamStatus.isSpam).toBeDefined()
    })
  })
})

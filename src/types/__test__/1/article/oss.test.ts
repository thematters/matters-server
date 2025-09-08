import type { Connections } from '#definitions/index.js'

import { AtomService, ChannelService } from '#connectors/index.js'

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

  test('query articles with sort', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { sort: 'mostAppreciations' } },
    })
    expect(errors1).toBeUndefined()
    expect(data1.oss.articles.edges.length).toBeGreaterThan(1)

    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { sort: 'mostBookmarks' } },
    })
    expect(errors2).toBeUndefined()
    expect(data2.oss.articles.edges.length).toBeGreaterThan(1)

    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { sort: 'mostComments' } },
    })
    expect(errors3).toBeUndefined()
    expect(data3.oss.articles.edges.length).toBeGreaterThan(1)

    const { errors: errors4, data: data4 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { sort: 'mostDonations' } },
    })
    expect(errors4).toBeUndefined()
    expect(data4.oss.articles.edges.length).toBeGreaterThan(1)

    const { errors: errors5, data: data5 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: { input: { sort: 'mostReadTime' } },
    })
    expect(errors5).toBeUndefined()
    expect(data5.oss.articles.edges.length).toBeGreaterThan(1)
  })

  test('query articles with datetimeRange filter', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // Test with a future date range (should return no results)
    const futureDate = new Date()
    futureDate.setFullYear(futureDate.getFullYear() + 1)
    const { data: futureData } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            datetimeRange: {
              start: futureDate,
              end: new Date(futureDate.getTime() + 86400000), // next day
            },
          },
        },
      },
    })
    expect(futureData.oss.articles.edges.length).toBe(0)

    // Test with a past date range
    const pastDate = new Date()
    pastDate.setFullYear(pastDate.getFullYear() - 1)
    const { data: pastData } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            datetimeRange: {
              start: pastDate,
              end: new Date(),
            },
          },
        },
      },
    })
    expect(pastData.oss.articles.edges.length).toBeGreaterThan(0)
  })

  test('query articles with search filter', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // Test article title search (now searches both articles and users)
    const { errors: errors1, data: data1 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: 'test article 1',
          },
        },
      },
    })
    expect(errors1).toBeUndefined()
    expect(data1.oss.articles.edges.length).toBeGreaterThan(0)

    // Test non-existent article title (searches both articles and users)
    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: 'non existent article title',
          },
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.oss.articles.edges.length).toBe(0)

    // Test user search with @username (now searches both articles and users)
    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: '@test1',
          },
        },
      },
    })
    expect(errors3).toBeUndefined()
    expect(data3.oss.articles.edges.length).toBeGreaterThan(0)

    // Test non-existent username (searches both articles and users)
    const { errors: errors4, data: data4 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: '@nonexistentuser',
          },
        },
      },
    })
    expect(errors4).toBeUndefined()
    expect(data4.oss.articles.edges.length).toBe(0)

    // Test search with empty string (searches both articles and users)
    const { errors: errors5, data: data5 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: '',
          },
        },
      },
    })
    expect(errors5).toBeUndefined()
    expect(data5.oss.articles.edges.length).toBeGreaterThan(0)

    // Test search with whitespace (searches both articles and users)
    const { errors: errors6, data: data6 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: '   ',
          },
        },
      },
    })
    expect(errors6).toBeUndefined()
    expect(data6.oss.articles.edges.length).toBeGreaterThan(0)

    // Test search with a term that could match both articles and users
    const { errors: errors7, data: data7 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: 'test',
          },
        },
      },
    })
    expect(errors7).toBeUndefined()
    expect(data7.oss.articles.edges.length).toBeGreaterThan(
      data1.oss.articles.edges.length
    )
  })
  test('query articles with search filter and datetimeRange filter', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { data: data1 } = await server.executeOperation({
      query: GET_OSS_ARTICLES,
      variables: {
        input: {
          filter: {
            searchKey: 'test',
            datetimeRange: {
              start: new Date('2024-01-01'),
              end: new Date('2024-01-02'),
            },
          },
        },
      },
    })
    expect(data1.oss.articles.edges.length).toBe(0)
  })
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

describe('query article pinHistory', () => {
  const GET_ARTICLE_PIN_HISTORY = /* GraphQL */ `
    query ($id: ID!) {
      article: node(input: { id: $id }) {
        ... on Article {
          id
          oss {
            pinHistory {
              feed {
                __typename
                id
                ... on IcymiTopic {
                  title
                }
                ... on TopicChannel {
                  name
                }
                ... on CurationChannel {
                  name
                }
                ... on Tag {
                  content
                }
              }
              pinnedAt
            }
          }
        }
      }
    }
  `

  test('query article pin history with all types', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })

    // Get an article to test with
    const testArticle = await atomService.findFirst({
      table: 'article',
      where: { state: 'active' },
    })

    if (!testArticle) {
      throw new Error('No active article found for testing')
    }

    const articleId = testArticle.id
    const globalId = btoa(`Article:${articleId}`)

    // Clean up existing pin history for this article
    await atomService.deleteMany({
      table: 'matters_choice',
      where: { articleId },
    })
    await atomService.deleteMany({
      table: 'topic_channel_article',
      where: { articleId },
    })
    await atomService.deleteMany({
      table: 'curation_channel_article',
      where: { articleId },
    })
    await atomService.update({
      table: 'article_tag',
      where: { articleId },
      data: { pinnedAt: null },
    })

    // 1. Create ICYMI Topic pin history using atomService
    const icymiTopic = await atomService.create({
      table: 'matters_choice_topic',
      data: {
        title: 'Test ICYMI Topic',
        articles: [articleId],
        state: 'published',
        publishedAt: new Date('2024-01-01'),
        pinAmount: 1,
      },
    })

    await atomService.create({
      table: 'matters_choice',
      data: {
        articleId,
      },
    })

    // 2. Create Topic Channel pin history using channelService
    const topicChannel = await channelService.createTopicChannel({
      name: 'Test Topic Channel for Pin History',
      note: 'Test channel for pin history',
      enabled: true,
    })

    await atomService.create({
      table: 'topic_channel_article',
      data: {
        channelId: topicChannel.id,
        articleId,
        pinnedAt: new Date('2024-02-01'),
      },
    })

    // 3. Create Curation Channel pin history using channelService
    const curationChannel = await channelService.createCurationChannel({
      name: 'Test Curation Channel for Pin History',
      note: 'Test curation channel for pin history',
    })

    await atomService.create({
      table: 'curation_channel_article',
      data: {
        channelId: curationChannel.id,
        articleId,
        pinnedAt: new Date('2024-03-01'),
      },
    })

    // 4. Create Tag pin history using atomService
    // Create a test tag directly using atomService
    const testTag = await atomService.create({
      table: 'tag',
      data: {
        content: 'test-pin-history-' + Date.now(), // Make it unique
        creator: testArticle.authorId,
      },
    })

    // Create article_tag relation
    await atomService.create({
      table: 'article_tag',
      data: {
        articleId,
        tagId: testTag.id,
      },
    })

    // Update the pinnedAt date
    await atomService.update({
      table: 'article_tag',
      where: { articleId, tagId: testTag.id },
      data: { pinnedAt: new Date('2024-04-01') },
    })

    // Query the article's pin history
    const { data, errors } = await server.executeOperation({
      query: GET_ARTICLE_PIN_HISTORY,
      variables: { id: globalId },
    })

    expect(errors).toBeUndefined()
    expect(data.article).toBeDefined()
    expect(data.article.oss).toBeDefined()
    expect(data.article.oss.pinHistory).toBeDefined()
    expect(Array.isArray(data.article.oss.pinHistory)).toBe(true)

    // Verify we have all 4 types of pin history
    expect(data.article.oss.pinHistory.length).toBeGreaterThanOrEqual(4)

    // Check for each type
    const pinTypes = data.article.oss.pinHistory.map(
      (item: any) => item.feed.__typename
    )
    expect(pinTypes).toContain('IcymiTopic')
    expect(pinTypes).toContain('TopicChannel')
    expect(pinTypes).toContain('CurationChannel')
    expect(pinTypes).toContain('Tag')

    // Verify they are sorted by pinnedAt in descending order
    for (let i = 0; i < data.article.oss.pinHistory.length - 1; i++) {
      const currentDate = new Date(data.article.oss.pinHistory[i].pinnedAt)
      const nextDate = new Date(data.article.oss.pinHistory[i + 1].pinnedAt)
      expect(currentDate.getTime()).toBeGreaterThanOrEqual(nextDate.getTime())
    }

    // Verify specific properties for each type
    for (const pinItem of data.article.oss.pinHistory) {
      expect(pinItem.feed).toBeDefined()
      expect(pinItem.feed.id).toBeDefined()
      expect(pinItem.pinnedAt).toBeDefined()

      switch (pinItem.feed.__typename) {
        case 'IcymiTopic':
          expect(pinItem.feed.title).toBeDefined()
          expect(pinItem.feed.title).toBe('Test ICYMI Topic')
          break
        case 'TopicChannel':
          expect(pinItem.feed.name).toBeDefined()
          expect(pinItem.feed.name).toBe('Test Topic Channel for Pin History')
          break
        case 'CurationChannel':
          expect(pinItem.feed.name).toBeDefined()
          expect(pinItem.feed.name).toBe(
            'Test Curation Channel for Pin History'
          )
          break
        case 'Tag':
          expect(pinItem.feed.content).toBeDefined()
          expect(pinItem.feed.content).toContain('test-pin-history-')
          break
      }
    }

    // Clean up test data
    await atomService.deleteMany({
      table: 'matters_choice',
      where: { articleId },
    })
    await atomService.deleteMany({
      table: 'matters_choice_topic',
      where: { id: icymiTopic.id },
    })
    await atomService.deleteMany({
      table: 'topic_channel_article',
      where: { articleId, channelId: topicChannel.id },
    })
    await atomService.deleteMany({
      table: 'curation_channel_article',
      where: { articleId, channelId: curationChannel.id },
    })
    await atomService.deleteMany({
      table: 'article_tag',
      where: { articleId, tagId: testTag.id },
    })

    // Clean up created channels
    await atomService.deleteMany({
      table: 'topic_channel',
      where: { id: topicChannel.id },
    })
    await atomService.deleteMany({
      table: 'curation_channel',
      where: { id: curationChannel.id },
    })
    await atomService.deleteMany({
      table: 'tag',
      where: { id: testTag.id },
    })
  })
})

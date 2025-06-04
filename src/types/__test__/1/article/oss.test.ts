import type { Connections } from '#definitions/index.js'

import { AtomService } from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../../utils.js'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
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

    // Test article title search
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

    // Test non-existent article title
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

    // Test user search with @username
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

    // Test non-existent username
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

    // Test search with empty string
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

    // Test search with whitespace
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

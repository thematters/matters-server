import type { Connections, Article } from '#definitions/index.js'
import _get from 'lodash/get.js'
import _omit from 'lodash/omit.js'

import {
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  CAMPAIGN_STATE,
} from '#common/enums/index.js'
import { fromGlobalId, toGlobalId } from '#common/utils/index.js'
import {
  ArticleService,
  AtomService,
  PaymentService,
  UserService,
  CampaignService,
} from '#connectors/index.js'

import {
  putDraft,
  testClient,
  updateUserState,
  genConnections,
  closeConnections,
} from '../../utils.js'

let connections: Connections
let userService: UserService
let articleService: ArticleService
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  articleService = new ArticleService(connections)
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const ARTICLE_DB_ID = '1'
const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: ARTICLE_DB_ID })

const GET_ARTICLE = /* GraphQL */ `
  query ($input: ArticleInput!) {
    article(input: $input) {
      id
      content
      contents {
        html
        markdown
      }
      requestForDonation
      replyToDonator
      canComment
      indentFirstLine
      sensitiveByAuthor
      sensitiveByAdmin
      readerCount
      donationCount
      donations(input: { first: 10 }) {
        totalCount
        edges {
          node {
            id
            sender {
              id
            }
          }
        }
      }
      dataHash
      mediaHash
      shortHash
      campaigns {
        campaign {
          id
        }
        stage {
          id
        }
      }
      bookmarkCount
    }
  }
`

const GET_ARTICLE_TAGS = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        tags {
          content
        }
      }
    }
  }
`

const TOGGLE_SUBSCRIBE_ARTICLE = /* GraphQL */ `
  mutation ($input: ToggleItemInput!) {
    toggleSubscribeArticle(input: $input) {
      subscribed
    }
  }
`

const GET_RELATED_ARTICLES = /* GraphQL */ `
  query ($input: ArticleInput!) {
    article(input: $input) {
      relatedArticles(input: {}) {
        edges {
          node {
            title
          }
        }
      }
    }
  }
`

describe('query articles', () => {
  test('query related articles', async () => {
    const mediaHash = 'someIpfsMediaHash1'
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_RELATED_ARTICLES,
      variables: { input: { mediaHash } },
    })
    expect(errors).toBeUndefined()
    expect(data.article.relatedArticles.edges).toBeDefined()
  })

  test('query article by mediaHash & shortHash', async () => {
    const anonymousServer = await testClient({ connections })

    const { data: data1, errors: errors1 } =
      await anonymousServer.executeOperation({
        query: GET_ARTICLE,
        variables: {
          input: {
            mediaHash: 'someIpfsMediaHash1',
          },
        },
      })
    expect(errors1).toBeUndefined()
    expect(data1.article.shortHash).toBe('short-hash-1')

    const { data: data2, errors: errors2 } =
      await anonymousServer.executeOperation({
        query: GET_ARTICLE,
        variables: {
          input: {
            shortHash: 'short-hash-1',
          },
        },
      })

    expect(errors2).toBeUndefined()
    expect(data2.article.mediaHash).toBe('someIpfsMediaHash1')
  })
})

describe('query tag on article', () => {
  test('query tag on article', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_ARTICLE_TAGS,
      variables: { input: { id } },
    })
    const tags = data && data.node && data.node.tags
    expect(
      new Set(tags.map(({ content }: { content: string }) => content))
    ).toEqual(new Set(['article', 'test']))
  })
})

describe('frozen user do muations to article', () => {
  // frozen user shared settings
  const frozenUser = { isAuth: true, isFrozen: true }
  const errorPath = 'errors.0.extensions.code'

  const frozeUser = async () =>
    updateUserState(
      {
        id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
        state: 'frozen',
      },
      connections
    )
  const activateUser = async () =>
    updateUserState(
      {
        id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
        state: 'active',
      },
      connections
    )

  test('subscribe article', async () => {
    await frozeUser()
    const server = await testClient({ ...frozenUser, connections })
    const result = await server.executeOperation({
      query: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: true,
        },
      },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
    await activateUser()
  })

  test('unsubscribe article', async () => {
    await frozeUser()
    const server = await testClient({ ...frozenUser, connections })
    const result = await server.executeOperation({
      query: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: false,
        },
      },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
    await activateUser()
  })

  test('create draft', async () => {
    await frozeUser()
    const result = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
        client: { isFrozen: true },
      },
      connections
    )
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
    await activateUser()
  })
})

describe('query article readerCount/donationCount', () => {
  beforeAll(async () => {
    // insert test data
    await connections.knex('article_ga4_data').insert({
      articleId: '1',
      totalUsers: '1',
      dateRange: '[2023-10-24,2023-10-24]',
    })
    const paymentService = new PaymentService(connections)
    await paymentService.createTransaction({
      amount: 1,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      senderId: '2',
      targetId: '1',
      targetType: TRANSACTION_TARGET_TYPE.article,
      provider: PAYMENT_PROVIDER.matters,
      providerTxId: Math.random().toString(),
    })
  })
  test('only article author can view readerCount', async () => {
    const anonymousServer = await testClient({ connections })
    const { data } = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(data.article.readerCount).toBe(0)

    const author = await atomService.userIdLoader.load('1')
    const authorServer = await testClient({
      connections,
      context: { viewer: author },
    })
    const { data: data2 } = await authorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(data2.article.readerCount).not.toBe(0)
  })
})

describe('query users articles', () => {
  const userName = 'test1'
  const GET_VIEWER_ARTICLES = /* GraphQL */ `
    query GetViewerArticles($input: UserArticlesInput!) {
      viewer {
        id
        articles(input: $input) {
          edges {
            node {
              id
              state
            }
          }
        }
      }
    }
  `
  const GET_USER_ARTICLES = /* GraphQL */ `
      query GetUserArticles($input: UserArticlesInput!) {
        user(input: {userName: "${userName}"}) {
          articles(input: $input) {
            edges {
              node {
                id
                state
              }
            }
          }
        }
      }
    `
  test('only author can view not-active articles', async () => {
    const author = await userService.findByUserName(userName)
    await articleService.archive('1')

    const authorServer = await testClient({
      connections,
      context: { viewer: author },
    })
    const { data: authorData } = await authorServer.executeOperation({
      query: GET_VIEWER_ARTICLES,
      variables: { input: { filter: { state: 'archived' } } },
    })

    expect(authorData.viewer.articles.edges[0].node.state).toBe('archived')

    const otherServer = await testClient({ connections })
    const { data: otherData } = await otherServer.executeOperation({
      query: GET_USER_ARTICLES,
      variables: { input: { filter: { state: 'archived' } } },
    })

    expect(otherData.user.articles.edges.length).toBe(0)
  })
})

describe('query article donations', () => {
  const authorId = '1'
  const articleId = '1'
  beforeAll(async () => {
    // insert test data
    const baseTx = {
      amount: 0.12,
      currency: PAYMENT_CURRENCY.USDT,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      provider: PAYMENT_PROVIDER.blockchain,
      recipientId: authorId,
      targetId: articleId,
      targetType: 4,
    }
    await connections.knex('transaction').insert([
      {
        ...baseTx,
        providerTxId: 'usdt-1',
        senderId: 2,
      },
      {
        ...baseTx,
        amount: 1.23,
        providerTxId: 'usdt-2',
        senderId: 3,
      },
      {
        ...baseTx,
        currency: PAYMENT_CURRENCY.LIKE,
        provider: PAYMENT_PROVIDER.likecoin,
        providerTxId: 'like-5',
        senderId: 3,
      },
      // sender is anonymous
      {
        ...baseTx,
        providerTxId: 'usdt-3',
        senderId: null,
      },
      {
        ...baseTx,
        providerTxId: 'usdt-4',
        senderId: null,
      },
      {
        ...baseTx,
        currency: PAYMENT_CURRENCY.HKD,
        provider: PAYMENT_PROVIDER.matters,
        providerTxId: 'hkd-1',
        senderId: null,
      },
    ])
  })
  test('can read article donations', async () => {
    const anonymousServer = await testClient({ connections })
    const { data } = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(data.article.donations.totalCount).toBe(5)
    expect(data.article.donations.edges.length).toBe(5)
    expect(
      data.article.donations.edges.filter((e: any) => e.node.sender === null)
        .length
    ).toBe(3)
  })

  test('donation count and donations is visible to public', async () => {
    // Test anonymous user
    const anonymousServer = await testClient({ connections })
    const { data: anonymousData } = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(anonymousData.article.donationCount).not.toBe(0)
    expect(anonymousData.article.donations.totalCount).not.toBe(0)
    expect(anonymousData.article.donations.edges.length).not.toBe(0)

    // Test non-author user
    const nonAuthorServer = await testClient({
      connections,
      isAuth: true,
    })
    const { data: nonAuthorData } = await nonAuthorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(nonAuthorData.article.donationCount).not.toBe(0)
    expect(nonAuthorData.article.donations.totalCount).not.toBe(0)
    expect(nonAuthorData.article.donations.edges.length).not.toBe(0)
  })
})

describe('articles versions', () => {
  const GET_ARTICLE_VERSIONS = /* GraphQL */ `
    query (
      $articleInput: ArticleInput!
      $versionsInput: ArticleVersionsInput!
    ) {
      article(input: $articleInput) {
        id
        contents {
          html
          markdown
        }
        versions(input: $versionsInput) {
          edges {
            node {
              id
              description
              dataHash
              mediaHash
              title
              summary
              contents {
                html
                markdown
              }
              createdAt
            }
          }
          totalCount
        }
      }
    }
  `
  test('query article versions', async () => {
    const mediaHash = 'someIpfsMediaHash2'
    const anonymousServer = await testClient({ connections })
    const { errors, data } = await anonymousServer.executeOperation({
      query: GET_ARTICLE_VERSIONS,
      variables: {
        articleInput: { mediaHash },
        versionsInput: { first: 1 },
      },
    })
    expect(errors).toBeUndefined()
    expect(fromGlobalId(data.article.versions.edges[0].node.id).type).toBe(
      NODE_TYPES.ArticleVersion
    )
    expect(data.article.versions.totalCount).toBe(1)

    const articleId = fromGlobalId(data.article.id).id

    const article = await articleService.baseFindById(articleId)

    const content = 'test content'
    const description = 'test description'
    await articleService.createNewArticleVersion(
      article.id,
      article.authorId,
      { content },
      description
    )

    const { errors: errors2, data: data2 } =
      await anonymousServer.executeOperation({
        query: GET_ARTICLE_VERSIONS,
        variables: {
          articleInput: { mediaHash },
          versionsInput: { first: 1 },
        },
      })
    expect(errors2).toBeUndefined()
    expect(data2.article.versions.totalCount).toBe(2)
    expect(data2.article.versions.edges[0].node.title).toBeDefined()
    expect(data2.article.versions.edges[0].node.contents.html).toBe(content)
    expect(data2.article.versions.edges[0].node.description).toBe(description)
  })
})

describe('query article campaigns', () => {
  let article: Article
  beforeAll(async () => {
    const campaignService = new CampaignService(connections)
    article = await atomService.findUnique({
      table: 'article',
      where: { id: '1' },
    })
    const campaign = await campaignService.createWritingChallenge({
      name: 'test',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ] as const,
      writingPeriod: [
        new Date('2010-01-02 11:30'),
        new Date('2010-01-02 15:00'),
      ] as const,
      creatorId: '1',
      state: CAMPAIGN_STATE.active,
    })
    const stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
      { name: 'stage2' },
    ])
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: article.authorId },
    })
    await campaignService.apply(campaign, user)
    await campaignService.submitArticleToCampaign(
      article,
      campaign.id,
      stages[0].id
    )
  })
  test('query article campaigns', async () => {
    const anonymousServer = await testClient({ connections })

    const { data } = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          shortHash: article.shortHash,
        },
      },
    })
    expect(data.article.campaigns.length).toBe(1)
  })
})

describe('article connections', () => {
  const GET_ARTICLE_CONNECTIONS = /* GraphQL */ `
    query ($input: ArticleInput!) {
      article(input: $input) {
        id
        connectedBy(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
        connections(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
        collection(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
      }
    }
  `

  test('query article connections', async () => {
    // Create test articles
    const [article1] = await articleService.createArticle({
      title: 'Test Article 1',
      content: 'Test content 1',
      authorId: '1',
    })
    const [article2] = await articleService.createArticle({
      title: 'Test Article 2',
      content: 'Test content 2',
      authorId: '1',
    })
    const [article3] = await articleService.createArticle({
      title: 'Test Article 3',
      content: 'Test content 3',
      authorId: '1',
    })

    // Create connections
    await atomService.create({
      table: 'article_connection',
      data: {
        entranceId: article1.id,
        articleId: article2.id,
        order: 0,
      },
    })
    await atomService.create({
      table: 'article_connection',
      data: {
        entranceId: article1.id,
        articleId: article3.id,
        order: 1,
      },
    })

    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: GET_ARTICLE_CONNECTIONS,
      variables: {
        input: {
          shortHash: article1.shortHash,
        },
      },
    })

    expect(errors).toBeUndefined()

    // Test new fields
    expect(data.article.connections.totalCount).toBe(2)
    expect(data.article.connections.edges.length).toBe(2)
    expect(data.article.connections.edges[0].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article2.id })
    )
    expect(data.article.connections.edges[1].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article3.id })
    )

    // Test deprecated fields still work
    expect(data.article.collection.totalCount).toBe(2)
    expect(data.article.collection.edges.length).toBe(2)
    expect(data.article.collection.edges[0].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article2.id })
    )
    expect(data.article.collection.edges[1].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article3.id })
    )

    // Test connectedBy fields
    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: GET_ARTICLE_CONNECTIONS,
      variables: {
        input: {
          shortHash: article2.shortHash,
        },
      },
    })

    expect(errors2).toBeUndefined()
    expect(data2.article.connectedBy.totalCount).toBe(1)
    expect(data2.article.connectedBy.edges.length).toBe(1)
    expect(data2.article.connectedBy.edges[0].node.id).toBe(
      toGlobalId({ type: NODE_TYPES.Article, id: article1.id })
    )
  })
})

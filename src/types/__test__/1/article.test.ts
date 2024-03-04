import type { Connections } from 'definitions'

import _get from 'lodash/get'
import _omit from 'lodash/omit'

import {
  NODE_TYPES,
  PAYMENT_CURRENCY,
  PAYMENT_PROVIDER,
  PUBLISH_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import {
  ArticleService,
  AtomService,
  PaymentService,
  UserService,
} from 'connectors'

import {
  publishArticle,
  putDraft,
  testClient,
  updateUserState,
  genConnections,
  closeConnections,
} from '../utils'

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const mediaHash = 'someIpfsMediaHash1'

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
    }
  }
`

const GET_ARTICLES = /* GraphQL */ `
  query ($input: ConnectionArgs!) {
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

const GET_ARTICLE_DRAFTS = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        drafts {
          id
          publishState
        }
        newestPublishedDraft {
          id
          publishState
        }
        newestUnpublishedDraft {
          id
          publishState
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

const PUBLISH_ARTICLE = `
  mutation($input: PublishArticleInput!) {
    publishArticle(input: $input) {
      id
      publishState
      title
      content
      createdAt
      iscnPublish
      article { id iscnId content }
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

describe('query article', () => {
  test('query articles', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: GET_ARTICLES,
      variables: { input: {} },
    })
    expect(data.oss.articles.edges.length).toBeGreaterThan(1)
  })

  test('query related articles', async () => {
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_RELATED_ARTICLES,
      variables: { input: { mediaHash } },
    })
    expect(data.article.relatedArticles.edges).toBeDefined()
  })

  test('query article by mediaHash & shortHash', async () => {
    const anonymousServer = await testClient({ connections })

    const result1 = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash: 'someIpfsMediaHash1',
        },
      },
    })
    // console.log('result1', result1)
    expect(_get(result1, 'data.article.shortHash')).toBe('short-hash-1')

    const result2 = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          shortHash: 'short-hash-1',
        },
      },
    })

    // console.log('result2', result2)
    expect(_get(result2, 'data.article.mediaHash')).toBe('someIpfsMediaHash1')
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

describe('query drafts on article', () => {
  test('query drafts on article', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 4 })
    const server = await testClient({ connections })
    const { data } = await server.executeOperation({
      query: GET_ARTICLE_DRAFTS,
      variables: { input: { id } },
    })

    // drafts
    const drafts = data && data.node && data.node.drafts
    expect(drafts[0].publishState).toEqual(PUBLISH_STATE.published)

    // unpublishedDraft
    const unpublishedDraft =
      data && data.node && data.node.newestUnpublishedDraft
    expect(unpublishedDraft).toBeNull()

    // publishedDraft
    const publishedDraft = data && data.node && data.node.newestPublishedDraft
    expect(publishedDraft.publishState).toEqual(PUBLISH_STATE.published)
  })
})

describe('publish article', () => {
  test('user w/o username can not publish', async () => {
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft }, connections)
    const server = await testClient({ noUserName: true, connections })

    const { errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: { input: { id } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('create a draft & publish it', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft }, connections)
    const { publishState, article } = await publishArticle({ id }, connections)
    expect(publishState).toBe(PUBLISH_STATE.pending)
    expect(article).toBeNull()
  })

  test('create a draft & publish with iscn', async () => {
    jest.setTimeout(10000)
    const draft = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          iscnPublish: true,
        },
      },
      connections
    )
    expect(_get(draft, 'id')).not.toBeNull()
    expect(_get(draft, 'iscnPublish')).toBe(true)

    const { publishState } = await publishArticle({ id: draft.id }, connections)
    expect(publishState).toBe(PUBLISH_STATE.pending)
  })

  test('publish published draft', async () => {
    const draftId = '4'
    const atomService = new AtomService(connections)
    await atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: { articleId: '4', archived: true },
    })
    const publishedDraftId = toGlobalId({ type: NODE_TYPES.Draft, id: draftId })
    const { publishState, article } = await publishArticle(
      {
        id: publishedDraftId,
      },
      connections
    )
    expect(publishState).toBe(PUBLISH_STATE.published)
    expect(article.content).not.toBeNull()
  })
})

describe('toggle article state', () => {
  test('subscribe an article', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.toggleSubscribeArticle.subscribed).toBe(true)

    const atomService = new AtomService(connections)
    const action = await atomService.findFirst({
      table: 'action_article',
      where: { targetId: ARTICLE_DB_ID },
      orderBy: [{ column: 'id', order: 'desc' }],
    })
    expect(action.targetId).toBe(ARTICLE_DB_ID)
    expect(action.articleVersionId).not.toBeNull()
  })

  test('unsubscribe an article ', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: false,
        },
      },
    })
    expect(_get(data, 'toggleSubscribeArticle.subscribed')).toBe(false)
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
  test('only article author can view readerCount/donationCount', async () => {
    const anonymousServer = await testClient({ connections })
    const { data } = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: { mediaHash: 'someIpfsMediaHash1' },
      },
    })
    expect(data.article.readerCount).toBe(0)
    expect(data.article.donationCount).toBe(0)

    const atomService = new AtomService(connections)
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
    expect(data2.article.donationCount).not.toBe(0)
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
    const userService = new UserService(connections)
    const articleService = new ArticleService(connections)
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
  beforeAll(async () => {
    // insert test data
    const baseTx = {
      amount: 0.12,
      currency: PAYMENT_CURRENCY.USDT,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      provider: PAYMENT_PROVIDER.blockchain,
      recipientId: 1,
      targetId: 1,
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

    const articleService = new ArticleService(connections)
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

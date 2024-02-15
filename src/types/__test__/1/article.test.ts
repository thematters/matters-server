import type { Connections } from 'definitions'

import _get from 'lodash/get'
import _omit from 'lodash/omit'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
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
  getUserContext,
  publishArticle,
  putDraft,
  testClient,
  updateUserState,
  genConnections,
  closeConnections,
} from '../utils'

declare global {
  // eslint-disable-next-line no-var
  var mockEnums: any
}

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
}, 50000)

afterAll(async () => {
  await closeConnections(connections)
})

jest.mock('common/enums', () => {
  const originalModule = jest.requireActual('common/enums')
  globalThis.mockEnums = {
    ...originalModule,
    __esModule: true,
  }
  return globalThis.mockEnums
})

const mediaHash = 'someIpfsMediaHash1'

const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })

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

const GET_VIEWER_STATUS = /* GraphQL */ `
  query {
    viewer {
      id
      articles(input: { first: null }) {
        edges {
          node {
            id
          }
        }
      }
      status {
        articleCount
        commentCount
        totalWordCount
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

const EDIT_ARTICLE = /* GraphQL */ `
  mutation ($input: EditArticleInput!) {
    editArticle(input: $input) {
      id
      summary
      summaryCustomized
      content
      access {
        circle {
          id
        }
      }
      collection(input: { first: null }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
      tags {
        id
        content
      }
      sticky
      state
      license
      requestForDonation
      replyToDonator
      revisionCount
      canComment
      sensitiveByAuthor
      sensitiveByAdmin
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
      connections,
      isAdmin: true,
    })
    const { data } = await server.executeOperation({
      query: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: true,
        },
      },
    })
    expect(_get(data, 'toggleSubscribeArticle.subscribed')).toBe(true)
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

describe('edit article', () => {
  test('edit article summary', async () => {
    const summary = 'my customized summary'
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          summary,
        },
      },
    })
    expect(_get(result, 'data.editArticle.summary')).toBe(summary)
    expect(_get(result, 'data.editArticle.summaryCustomized')).toBe(true)

    // reset summary
    const resetResult1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          summary: null,
        },
      },
    })
    expect(
      _get(resetResult1, 'data.editArticle.summary.length')
    ).toBeGreaterThan(0)
    expect(_get(resetResult1, 'data.editArticle.summaryCustomized')).toBe(false)

    const resetResult2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          summary: '',
        },
      },
    })
    expect(_get(resetResult2, 'data.editArticle.summaryCustomized')).toBe(false)
  })

  test('edit article tags', async () => {
    const tags = ['abc', '123', 'tag3', 'tag4', 'tag5']
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const limit = 3
    globalThis.mockEnums.MAX_TAGS_PER_ARTICLE_LIMIT = limit
    // set tags out of limit
    const failedRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, limit + 1),
        },
      },
    })
    expect(_get(failedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} tags on an article`
    )

    // set tags within limit
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, limit),
        },
      },
    })
    expect(_get(result, 'data.editArticle.tags.length')).toBe(limit)
    expect(_get(result, 'data.editArticle.tags.0.content')).toBe(tags[0])
    expect(_get(result, 'data.editArticle.tags.1.content')).toBe(tags[1])
    expect(_get(result, 'data.editArticle.tags.2.content')).toBe(tags[2])

    // do not change tags when not in input
    const otherRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
        },
      },
    })
    expect(_get(otherRes, 'data.editArticle.tags.length')).toBe(limit)
    expect(_get(otherRes, 'data.editArticle.tags.0.content')).toBe(tags[0])
    expect(_get(otherRes, 'data.editArticle.tags.1.content')).toBe(tags[1])
    expect(_get(otherRes, 'data.editArticle.tags.2.content')).toBe(tags[2])

    // decrease tags
    const decreaseRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, limit - 1),
        },
      },
    })
    expect(_get(decreaseRes, 'data.editArticle.tags.length')).toBe(limit - 1)

    // increase tags
    const increaseRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, limit),
        },
      },
    })
    expect(_get(increaseRes, 'data.editArticle.tags.length')).toBe(limit)

    // out of limit tags can remain
    const smallerLimit = limit - 2
    globalThis.mockEnums.MAX_TAGS_PER_ARTICLE_LIMIT = smallerLimit

    const remainRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, smallerLimit + 2),
        },
      },
    })
    expect(_get(remainRes, 'data.editArticle.tags.length')).toBe(
      smallerLimit + 2
    )

    // out of limit collection can not increase

    const failedRes2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, smallerLimit + 3),
        },
      },
    })
    expect(_get(failedRes2, 'errors.0.message')).toBe(
      `Not allow more than ${smallerLimit} tags on an article`
    )

    // out of limit collection can decrease,  even to a amount still out of limit

    const stillOutLimitRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: tags.slice(0, smallerLimit + 1),
        },
      },
    })
    expect(_get(stillOutLimitRes, 'data.editArticle.tags.length')).toBe(
      smallerLimit + 1
    )

    // reset tags
    const resetResult1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.tags.length')).toBe(0)
    const resetResult2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: null,
        },
      },
    })
    console.log(resetResult2.errors)
    expect(resetResult2.data.editArticle.tags.length).toBe(0)
  })

  test('edit article collection', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const collection = [
      toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 4 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 5 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 6 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 7 }),
    ]
    const limit = 2

    // set collection within limit
    const res = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit),
        },
      },
    })
    expect(_get(res, 'data.editArticle.collection.totalCount')).toBe(limit)
    expect([
      _get(res, 'data.editArticle.collection.edges.0.node.id'),
      _get(res, 'data.editArticle.collection.edges.1.node.id'),
    ]).toEqual(collection.slice(0, limit))

    // set collection out of limit
    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = limit
    const failedRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit + 1),
        },
      },
    })
    expect(_get(failedRes, 'errors.0.message')).toBe(
      `Not allow more than ${limit} articles in connection`
    )

    // do not change collection when not in input
    const otherRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
        },
      },
    })
    expect(_get(otherRes, 'data.editArticle.collection.totalCount')).toBe(limit)
    expect([
      _get(otherRes, 'data.editArticle.collection.edges.0.node.id'),
      _get(otherRes, 'data.editArticle.collection.edges.1.node.id'),
    ]).toEqual(collection.slice(0, limit))

    // reorder collection
    const reorderCollection = [...collection.slice(0, limit)].reverse()
    expect(reorderCollection).not.toBe(collection.slice(0, limit))

    const reorderRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: reorderCollection,
        },
      },
    })
    expect(_get(reorderRes, 'data.editArticle.collection.totalCount')).toBe(
      reorderCollection.length
    )
    expect([
      _get(reorderRes, 'data.editArticle.collection.edges.0.node.id'),
      _get(reorderRes, 'data.editArticle.collection.edges.1.node.id'),
    ]).toEqual(reorderCollection)

    // decrease collection
    const decreaseRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit - 1),
        },
      },
    })

    expect(_get(decreaseRes, 'data.editArticle.collection.totalCount')).toBe(
      limit - 1
    )
    expect([
      _get(decreaseRes, 'data.editArticle.collection.edges.0.node.id'),
    ]).toEqual(collection.slice(0, limit - 1))

    // reset collection
    const resetResult1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.collection.totalCount')).toBe(0)

    const resetResult2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: null,
        },
      },
    })
    expect(_get(resetResult2, 'data.editArticle.collection.totalCount')).toBe(0)

    // out of limit collection can remain
    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = 10

    const res1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit + 2),
        },
      },
    })
    expect(_get(res1, 'data.editArticle.collection.totalCount')).toBe(limit + 2)

    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = limit
    const remainRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit + 2),
        },
      },
    })
    expect(_get(remainRes, 'data.editArticle.collection.totalCount')).toBe(
      limit + 2
    )

    // out of limit collection can not increase
    const failedRes2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit + 3),
        },
      },
    })
    expect(_get(failedRes2, 'errors.0.message')).toBe(
      `Not allow more than ${limit} articles in connection`
    )

    // out of limit collection can decrease,  even to a amount still out of limit
    const stillOutLimitRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit + 1),
        },
      },
    })
    expect(
      _get(stillOutLimitRes, 'data.editArticle.collection.totalCount')
    ).toBe(limit + 1)

    const withinLimitRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: collection.slice(0, limit - 1),
        },
      },
    })
    expect(_get(withinLimitRes, 'data.editArticle.collection.totalCount')).toBe(
      limit - 1
    )
  })

  test('toggle article sticky', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const enableResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          sticky: true,
        },
      },
    })
    expect(_get(enableResult, 'data.editArticle.sticky')).toBe(true)

    const disableResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          sticky: false,
        },
      },
    })
    expect(_get(disableResult, 'data.editArticle.sticky')).toBe(false)
  })

  test('edit license', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          license: ARTICLE_LICENSE_TYPE.cc_0,
        },
      },
    })
    expect(_get(result, 'data.editArticle.license')).toBe(
      ARTICLE_LICENSE_TYPE.cc_0
    )
    expect(_get(result, 'data.editArticle.revisionCount')).toBe(0)

    // change license to CC2 should throw error
    const changeCC2Result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
        },
      },
    })
    expect(changeCC2Result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT')

    // change license to ARR should succeed
    const changeResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          license: ARTICLE_LICENSE_TYPE.arr,
        },
      },
    })
    expect(_get(changeResult, 'data.editArticle.license')).toBe(
      ARTICLE_LICENSE_TYPE.arr
    )
    expect(_get(result, 'data.editArticle.revisionCount')).toBe(0)

    // reset license
    const resetResult1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          license: null,
        },
      },
    })
    expect(
      _get(resetResult1, 'data.editArticle.summary.length')
    ).toBeGreaterThan(0)
    expect(_get(resetResult1, 'data.editArticle.summaryCustomized')).toBe(false)

    // should be still 0, after whatever how many times changing license
    expect(_get(result, 'data.editArticle.revisionCount')).toBe(0)
  })

  test('edit support settings', async () => {
    const requestForDonation = 'test support request'
    const replyToDonator = 'test support reply'
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          requestForDonation,
          replyToDonator,
        },
      },
    })

    expect(_get(result, 'data.editArticle.requestForDonation')).toBe(
      requestForDonation
    )
    expect(_get(result, 'data.editArticle.replyToDonator')).toBe(replyToDonator)

    // update one support settings field will not reset other one
    const requestForDonation2 = ''
    const result2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          requestForDonation: requestForDonation2,
        },
      },
    })
    expect(_get(result2, 'data.editArticle.requestForDonation')).toBe(
      requestForDonation2
    )
    expect(_get(result2, 'data.editArticle.replyToDonator')).toBe(
      replyToDonator
    )

    // non-donators can not view replyToDonator
    const anonymousServer = await testClient({ connections })
    const result3 = await anonymousServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash,
        },
      },
    })
    expect(_get(result3, 'data.article.requestForDonation')).toBe(
      requestForDonation2
    )
    expect(_get(result3, 'data.article.replyToDonator')).toBe(null)

    const context = await getUserContext(
      { email: 'test2@matters.news' },
      connections
    )
    const donatorServer = await testClient({ context, connections })
    const result4 = await donatorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash,
        },
      },
    })
    expect(_get(result4, 'data.article.requestForDonation')).toBe(
      requestForDonation2
    )
    expect(_get(result4, 'data.article.replyToDonator')).toBe(null)

    // donators can view replyToDonator
    const paymentService = new PaymentService(connections)
    await paymentService.createTransaction({
      amount: 1,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      senderId: context.viewer.id,
      targetId: '1',
      targetType: TRANSACTION_TARGET_TYPE.article,
      provider: PAYMENT_PROVIDER.matters,
      providerTxId: Math.random().toString(),
    })
    const result5 = await donatorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash,
        },
      },
    })
    expect(_get(result5, 'data.article.requestForDonation')).toBe(
      requestForDonation2
    )
    expect(_get(result5, 'data.article.replyToDonator')).toBe(replyToDonator)
  })

  test('edit comment settings', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash,
        },
      },
    })
    expect(_get(result, 'data.article.canComment')).toBeTruthy()

    // can not turn off
    const result2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          canComment: false,
        },
      },
    })
    expect(result2.errors).not.toBeUndefined()

    // can turn on
    const atomService = new AtomService(connections)
    await atomService.update({
      table: 'draft',
      where: { id: 1 },
      data: { canComment: false },
    })
    const result3 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          canComment: true,
        },
      },
    })
    expect(_get(result3, 'data.editArticle.canComment')).toBeTruthy()
  })

  test('edit sensitive settings', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          mediaHash,
        },
      },
    })
    expect(_get(result, 'data.article.sensitiveByAuthor')).toBeFalsy()
    expect(_get(result, 'data.article.sensitiveByAdmin')).toBeFalsy()

    // turn on by author
    const result1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          sensitive: true,
        },
      },
    })
    expect(_get(result1, 'data.editArticle.sensitiveByAuthor')).toBeTruthy()

    // turn on by admin
    const adminServer = await testClient({
      isAuth: true,
      connections,
      isAdmin: true,
    })
    const UPDATE_ARTICLE_SENSITIVE = `
      mutation UpdateArticleSensitive($input: UpdateArticleSensitiveInput!) {
        updateArticleSensitive(input: $input) {
          id
          sensitiveByAdmin
        }
      }
    `
    const result2 = await adminServer.executeOperation({
      query: UPDATE_ARTICLE_SENSITIVE,
      variables: {
        input: {
          id: ARTICLE_ID,
          sensitive: true,
        },
      },
    })
    expect(
      _get(result2, 'data.updateArticleSensitive.sensitiveByAdmin')
    ).toBeTruthy()
  })

  test('archive article', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const { data } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    const articleId = _get(data, 'viewer.articles.edges.0.node.id')
    const articleDbId = fromGlobalId(articleId).id

    // create duplicate article with same draft
    const articleService = new ArticleService(connections)
    const article = await articleService.baseFindById(articleDbId)
    const articleVersion = await articleService.loadLatestArticleVersion(
      article.id
    )
    const articleContent = await articleService.loadLatestArticleContent(
      article.id
    )
    const [article2, _] = await articleService.createArticle({
      title: articleVersion.title,
      content: articleContent,
      authorId: article.authorId,
    })
    const article2Id = toGlobalId({ type: NODE_TYPES.Article, id: article2.id })

    // archive
    const { data: archivedData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: article2Id,
          state: ARTICLE_STATE.archived,
        },
      },
    })
    expect(archivedData.editArticle.state).toBe(ARTICLE_STATE.archived)

    // refetch & expect de-duplicated
    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    expect(_get(data, 'viewer.status.articleCount') - 1).toBe(
      _get(data2, 'viewer.status.articleCount')
    )
    expect(
      _get(data, 'viewer.status.totalWordCount') - articleVersion.wordCount
    ).toBe(_get(data2, 'viewer.status.totalWordCount'))
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

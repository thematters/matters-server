import _get from 'lodash/get'
import _omit from 'lodash/omit'
import { v4 } from 'uuid'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  PUBLISH_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { ArticleService, AtomService, PaymentService } from 'connectors'
import { GQLAppreciateArticleInput, GQLNodeInput } from 'definitions'

import {
  getUserContext,
  publishArticle,
  putDraft,
  testClient,
  updateUserState,
} from './utils'

declare global {
  // eslint-disable-next-line no-var
  var mockEnums: any
}

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

const GET_ARTICLE_APPRECIATIONS_RECEIVED_TOTAL = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        appreciationsReceivedTotal
      }
    }
  }
`

const APPRECIATE_ARTICLE = /* GraphQL */ `
  mutation ($input: AppreciateArticleInput!) {
    appreciateArticle(input: $input) {
      appreciationsReceivedTotal
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

export const getArticleAppreciationsReceivedTotal = async (
  input: GQLNodeInput
) => {
  const server = await testClient()
  const { data } = await server.executeOperation({
    query: GET_ARTICLE_APPRECIATIONS_RECEIVED_TOTAL,
    variables: { input },
  })
  const { appreciationsReceivedTotal } = data && data.node && data.node
  return appreciationsReceivedTotal
}

export const appreciateArticle = async (input: GQLAppreciateArticleInput) => {
  const server = await testClient({
    isAuth: true,
  })
  const result = await server.executeOperation({
    query: APPRECIATE_ARTICLE,
    variables: { input },
  })

  if (result.errors) {
    throw result.errors
  }

  const article = result && result.data && result.data.appreciateArticle
  return article
}

describe('query article', () => {
  test('query articles', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: true,
    })
    const result = await server.executeOperation({
      query: GET_ARTICLES,
      variables: { input: {} },
    })
    expect(_get(result, 'data.oss.articles.edges.length')).toBeGreaterThan(1)
  })

  test('query related articles', async () => {
    const server = await testClient()
    const result = await server.executeOperation({
      query: GET_RELATED_ARTICLES,
      variables: { input: { mediaHash } },
    })
    expect(_get(result, 'data.article.relatedArticles.edges')).toBeDefined()
  })
})

describe('query tag on article', () => {
  test('query tag on article', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const server = await testClient()
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
    const server = await testClient()
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
  test('create a draft & publish it', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft })
    const { publishState, article } = await publishArticle({ id })
    expect(publishState).toBe(PUBLISH_STATE.pending)
    expect(article).toBeNull()
  })

  test('create a draft & publish with iscn', async () => {
    jest.setTimeout(10000)
    const draft = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        iscnPublish: true,
      },
    })
    expect(_get(draft, 'id')).not.toBeNull()
    expect(_get(draft, 'iscnPublish')).toBe(true)

    const { publishState } = await publishArticle({ id: draft.id })
    expect(publishState).toBe(PUBLISH_STATE.pending)
  })

  test('publish published draft', async () => {
    const draftId = '4'
    const atomService = new AtomService()
    await atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: { articleId: '4', archived: true },
    })
    const publishedDraftId = toGlobalId({ type: NODE_TYPES.Draft, id: draftId })
    const { publishState, article } = await publishArticle({
      id: publishedDraftId,
    })
    expect(publishState).toBe(PUBLISH_STATE.published)
    expect(article.content).not.toBeNull()
  })
})

describe('toggle article state', () => {
  test('subscribe an article', async () => {
    const server = await testClient({
      isAuth: true,
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
    updateUserState({
      id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
      state: 'frozen',
    })
  const activateUser = async () =>
    updateUserState({
      id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
      state: 'active',
    })

  test('subscribe article', async () => {
    await frozeUser()
    const server = await testClient(frozenUser)
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
    const server = await testClient(frozenUser)
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
    const result = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
      client: { isFrozen: true },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
    await activateUser()
  })
})

describe('edit article', () => {
  test('edit article summary', async () => {
    const summary = 'my customized summary'
    const server = await testClient({
      isAuth: true,
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
    expect(_get(resetResult2, 'data.editArticle.tags.length')).toBe(0)
  })

  test('edit article collection', async () => {
    const server = await testClient({
      isAuth: true,
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
    globalThis.mockEnums.MAX_ARTICLES_PER_COLLECTION_LIMIT = limit
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
      `Not allow more than ${limit} articles in collection`
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
    globalThis.mockEnums.MAX_ARTICLES_PER_COLLECTION_LIMIT = 10

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

    globalThis.mockEnums.MAX_ARTICLES_PER_COLLECTION_LIMIT = limit
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
      `Not allow more than ${limit} articles in collection`
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
    const requestForDonation2 = 'test support request2'
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
    const anonymousServer = await testClient()
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

    const context = await getUserContext({ email: 'test2@matters.news' })
    const donatorServer = await testClient({ context })
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
    const paymentService = new PaymentService()
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
    const atomService = new AtomService()
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
    })

    const { data } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    const articleId = _get(data, 'viewer.articles.edges.0.node.id')
    const articleDbId = fromGlobalId(articleId).id

    // create duplicate article with same draft
    const articleService = new ArticleService()
    const article = await articleService.baseFindById(articleDbId)
    const article2 = await articleService.baseCreate({
      ..._omit(article, ['id', 'updatedAt', 'createdAt']),
      uuid: v4(),
    })
    const article2Id = toGlobalId({ type: NODE_TYPES.Article, id: article2.id })

    // archive
    const archiveResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: article2Id,
          state: ARTICLE_STATE.archived,
        },
      },
    })
    expect(_get(archiveResult, 'data.editArticle.state')).toBe(
      ARTICLE_STATE.archived
    )

    // refetch & expect de-duplicated
    const { data: data2 } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    expect(_get(data, 'viewer.status.articleCount') - 1).toBe(
      _get(data2, 'viewer.status.articleCount')
    )
    expect(_get(data, 'viewer.status.totalWordCount') - article.wordCount).toBe(
      _get(data2, 'viewer.status.totalWordCount')
    )
  })
})

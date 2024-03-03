import type { Connections } from 'definitions'

import _get from 'lodash/get'

import { AtomService, ArticleService, PaymentService } from 'connectors'
import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
} from 'common/enums'
import { toGlobalId, fromGlobalId } from 'common/utils'
import {
  getUserContext,
  testClient,
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
}, 30000)

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

const GET_ARTICLE = /* GraphQL */ `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        title
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
        revisionCount
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

const EDIT_ARTICLE = /* GraphQL */ `
  mutation ($input: EditArticleInput!) {
    editArticle(input: $input) {
      id
      title
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
      canComment
      sensitiveByAuthor
      sensitiveByAdmin
      revisionCount
      versions(input: { first: 1 }) {
        totalCount
        edges {
          node {
            id
            ... on ArticleVersion {
              description
            }
          }
        }
      }
    }
  }
`

describe('edit article', () => {
  const authorId = '1'
  const titleOriginal = 'original title'
  const contentOriginal = 'original content'
  let articleId: string
  let articleGlobalId: string
  beforeEach(async () => {
    const articleService = new ArticleService(connections)
    const [{ id: _articleId }] = await articleService.createArticle({
      title: titleOriginal,
      content: contentOriginal,
      authorId,
    })
    articleId = _articleId
    articleGlobalId = toGlobalId({ type: NODE_TYPES.Article, id: articleId })
  })
  test('edit article content', async () => {
    const content = 'my customized content'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          content,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.content).toContain(content)
    expect(data.editArticle.revisionCount).toBe(1)

    // same content will not update revision count
    const { errors: errors2, data: data2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          content,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.editArticle.content).toContain(content)
    expect(data2.editArticle.revisionCount).toBe(1)
  })
  test('edit article title', async () => {
    const title = 'my customized title'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.title).toBe(title)
    expect(data.editArticle.revisionCount).toBe(1)

    // same title will not update revision count
    const { data: sameData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title,
        },
      },
    })
    expect(sameData.editArticle.title).toBe(title)
    expect(sameData.editArticle.revisionCount).toBe(1)

    // empty string is allowed
    const { data: dataEmptyString } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title: '',
        },
      },
    })
    expect(dataEmptyString.editArticle.title).toBe('')
    expect(dataEmptyString.editArticle.revisionCount).toBe(2)

    //  null same as empty string
    const { data: dataNull } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title: null,
        },
      },
    })
    expect(dataNull.editArticle.title).toBe('')
    expect(dataNull.editArticle.revisionCount).toBe(2)
  })
  test('edit article summary', async () => {
    const summary = 'my customized summary'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          summary,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.summary).toBe(summary)
    expect(data.editArticle.summaryCustomized).toBe(true)
    expect(data.editArticle.revisionCount).toBe(1)

    // reset summary
    const { data: resetData1 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          summary: null,
        },
      },
    })
    expect(resetData1.editArticle.summary.length).toBeGreaterThan(0)
    expect(resetData1.editArticle.summaryCustomized).toBe(false)
    expect(resetData1.editArticle.revisionCount).toBe(2)

    const { data: resetData2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          summary: '',
        },
      },
    })
    expect(resetData2.editArticle.summaryCustomized).toBe(false)
    expect(resetData2.editArticle.revisionCount).toBe(2)
  })

  test('edit article tags', async () => {
    const tags = ['abc', '123', 'tag3', 'tag4', 'tag5']
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const limit = 3
    globalThis.mockEnums.MAX_TAGS_PER_ARTICLE_LIMIT = limit
    // set tags out of limit
    const { errors: failedErrors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, limit + 1),
        },
      },
    })
    expect(failedErrors[0].message).toBe(
      `Not allow more than ${limit} tags on an article`
    )

    // set tags within limit
    const { data: succeededData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, limit),
        },
      },
    })
    expect(succeededData.editArticle.tags.length).toBe(limit)
    expect(succeededData.editArticle.tags[0].content).toBe(tags[0])
    expect(succeededData.editArticle.tags[1].content).toBe(tags[1])
    expect(succeededData.editArticle.tags[2].content).toBe(tags[2])
    expect(succeededData.editArticle.revisionCount).toBe(1)

    // do not change tags when not in input
    const { data: otherData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(otherData.editArticle.tags.length).toBe(limit)
    expect(otherData.editArticle.tags[0].content).toBe(tags[0])
    expect(otherData.editArticle.tags[1].content).toBe(tags[1])
    expect(otherData.editArticle.tags[2].content).toBe(tags[2])
    expect(otherData.editArticle.revisionCount).toBe(1)

    // decrease tags
    const { data: decreaseData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, limit - 1),
        },
      },
    })
    expect(decreaseData.editArticle.tags.length).toBe(limit - 1)
    expect(decreaseData.editArticle.revisionCount).toBe(2)

    // increase tags
    const { data: increaseData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, limit),
        },
      },
    })
    expect(increaseData.editArticle.tags.length).toBe(limit)
    expect(increaseData.editArticle.revisionCount).toBe(3)

    // out of limit tags can remain
    const smallerLimit = limit - 2
    globalThis.mockEnums.MAX_TAGS_PER_ARTICLE_LIMIT = smallerLimit

    // edit tags hit revision limit
    const { errors: hitRevisionLimitErrors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, smallerLimit + 2),
        },
      },
    })
    expect(hitRevisionLimitErrors[0].extensions.code).toBe(
      'ARTICLE_REVISION_REACH_LIMIT'
    )

    // workaround revision limit for testing
    const originalCheckRevisionCount =
      globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT
    globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT = 100

    const { data: remainData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, smallerLimit + 2),
        },
      },
    })
    expect(remainData.editArticle.tags.length).toBe(smallerLimit + 2)

    // out of limit collection can not increase

    const failedRes2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
          tags: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.tags.length')).toBe(0)
    const resetResult2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: null,
        },
      },
    })
    expect(resetResult2.data.editArticle.tags.length).toBe(0)

    globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT = originalCheckRevisionCount
  })

  test('edit article connections', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const collection = [
      toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 4 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 5 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 6 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 7 }),
    ]
    const limit = 2

    // set connections within limit
    const { data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: collection.slice(0, limit),
        },
      },
    })
    expect(data.editArticle.collection.totalCount).toBe(limit)
    expect([
      data.editArticle.collection.edges[0].node.id,
      data.editArticle.collection.edges[1].node.id,
    ]).toEqual(collection.slice(0, limit))
    expect(data.editArticle.revisionCount).toBe(1)

    // set connections out of limit
    globalThis.mockEnums.MAX_ARTICLES_PER_CONNECTION_LIMIT = limit
    const failedRes = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
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

    // workaround revision limit for testing
    const originalCheckRevisionCount =
      globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT
    globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT = 100

    // reset collection
    const resetResult1 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.collection.totalCount')).toBe(0)

    const resetResult2 = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
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
          id: articleGlobalId,
          collection: collection.slice(0, limit - 1),
        },
      },
    })
    expect(_get(withinLimitRes, 'data.editArticle.collection.totalCount')).toBe(
      limit - 1
    )

    globalThis.mockEnums.MAX_ARTICLE_REVISION_COUNT = originalCheckRevisionCount
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
          id: articleGlobalId,
          sticky: true,
        },
      },
    })
    expect(_get(enableResult, 'data.editArticle.sticky')).toBe(true)

    const disableResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
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
    })
    const { data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          license: ARTICLE_LICENSE_TYPE.cc_0,
        },
      },
    })
    expect(data.editArticle.license).toBe(ARTICLE_LICENSE_TYPE.cc_0)
    expect(data.editArticle.revisionCount).toBe(0)

    // change license to CC2 should throw error
    const { errors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')

    // change license to ARR should succeed
    const { data: data2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          license: ARTICLE_LICENSE_TYPE.arr,
        },
      },
    })
    expect(data2.editArticle.license).toBe(ARTICLE_LICENSE_TYPE.arr)
    expect(data2.editArticle.revisionCount).toBe(0)

    // reset license
    const { data: data3 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          license: null,
        },
      },
    })
    expect(data3.editArticle.summary.length).toBeGreaterThan(0)
    expect(data3.editArticle.summaryCustomized).toBe(false)

    // should be still 0, after whatever how many times changing license
    expect(data3.editArticle.revisionCount).toBe(0)
  })

  test('edit support settings', async () => {
    const requestForDonation = 'test support request'
    const replyToDonator = 'test support reply'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          requestForDonation,
          replyToDonator,
        },
      },
    })

    expect(data.editArticle.requestForDonation).toBe(requestForDonation)
    expect(data.editArticle.replyToDonator).toBe(replyToDonator)

    // update one support settings field will not reset other one
    const requestForDonation2 = ''
    const { data: data2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          requestForDonation: requestForDonation2,
        },
      },
    })
    expect(data2.editArticle.requestForDonation).toBe(requestForDonation2)
    expect(data2.editArticle.replyToDonator).toBe(replyToDonator)

    // non-donators can not view replyToDonator
    const anonymousServer = await testClient({ connections })
    const { data: data3, errors: errors3 } =
      await anonymousServer.executeOperation({
        query: GET_ARTICLE,
        variables: {
          input: {
            id: articleGlobalId,
          },
        },
      })
    expect(errors3).toBeUndefined()
    expect(data3.node.requestForDonation).toBe(requestForDonation2)
    expect(data3.node.replyToDonator).toBe(null)

    const context = await getUserContext(
      { email: 'test2@matters.news' },
      connections
    )
    const donatorServer = await testClient({ context, connections })
    const { data: data4 } = await donatorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(data4.node.requestForDonation).toBe(requestForDonation2)
    expect(data4.node.replyToDonator).toBe(null)

    // donators can view replyToDonator
    const paymentService = new PaymentService(connections)
    await paymentService.createTransaction({
      amount: 1,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
      senderId: context.viewer.id,
      targetId: articleId,
      targetType: TRANSACTION_TARGET_TYPE.article,
      provider: PAYMENT_PROVIDER.matters,
      providerTxId: Math.random().toString(),
    })
    const { data: data5 } = await donatorServer.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(data5.node.requestForDonation).toBe(requestForDonation2)
    expect(data5.node.replyToDonator).toBe(replyToDonator)
  })

  test('edit comment settings', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.node.canComment).toBeTruthy()

    // can not turn off
    const { errors: errors2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          canComment: false,
        },
      },
    })
    expect(errors2).not.toBeUndefined()

    // can turn on
    const atomService = new AtomService(connections)
    await atomService.update({
      table: 'draft',
      where: { id: 1 },
      data: { canComment: false },
    })
    const { data: data3 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          canComment: true,
        },
      },
    })
    expect(data3.editArticle.canComment).toBeTruthy()
    expect(data3.editArticle.revisionCount).toBe(0)
  })

  test('edit sensitive settings', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { data } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(data.node.sensitiveByAuthor).toBeFalsy()
    expect(data.node.sensitiveByAdmin).toBeFalsy()
    expect(data.node.revisionCount).toBe(0)

    // turn on by author
    const { data: data2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          sensitive: true,
        },
      },
    })
    expect(data2.editArticle.sensitiveByAuthor).toBeTruthy()
    expect(data2.editArticle.revisionCount).toBe(0)

    // turn on by admin
    const adminServer = await testClient({
      isAuth: true,
      isAdmin: true,
      connections,
    })
    const UPDATE_ARTICLE_SENSITIVE = `
      mutation UpdateArticleSensitive($input: UpdateArticleSensitiveInput!) {
        updateArticleSensitive(input: $input) {
          id
          sensitiveByAdmin
        }
      }
    `
    const { data: data3 } = await adminServer.executeOperation({
      query: UPDATE_ARTICLE_SENSITIVE,
      variables: {
        input: {
          id: articleGlobalId,
          sensitive: true,
        },
      },
    })
    expect(data3.updateArticleSensitive.sensitiveByAdmin).toBeTruthy()
    const { data: data4 } = await server.executeOperation({
      query: GET_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(data4.node.sensitiveByAuthor).toBeTruthy()
    expect(data4.node.sensitiveByAdmin).toBeTruthy()
    expect(data4.node.revisionCount).toBe(0)
    expect(data4.node.revisionCount).toBe(0)
  })

  test('archive article', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })

    const { data } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })

    const articleId = data.viewer.articles.edges[0].node.id
    const articleDbId = fromGlobalId(articleId).id

    // create duplicate article with same content
    const articleService = new ArticleService(connections)
    const article = await articleService.baseFindById(articleDbId)
    const articleVersion = await articleService.loadLatestArticleVersion(
      article.id
    )
    const articleContent = await articleService.loadLatestArticleContent(
      article.id
    )
    const [article2, articleVersion2] = await articleService.createArticle({
      title: articleVersion.title,
      content: articleContent,
      authorId: article.authorId,
    })
    const article2Id = toGlobalId({ type: NODE_TYPES.Article, id: article2.id })

    const { data: beforeData } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })

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
    const { data: afterData } = await server.executeOperation({
      query: GET_VIEWER_STATUS,
    })
    expect(beforeData.viewer.status.articleCount - 1).toBe(
      afterData.viewer.status.articleCount
    )
    expect(
      beforeData.viewer.status.totalWordCount - articleVersion2.wordCount
    ).toBe(afterData.viewer.status.totalWordCount)
  })
  test('add description', async () => {
    const description = 'some description'
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          content: 'new content',
          description,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.versions.edges[0].node.description).toBe(
      description
    )
  })
})

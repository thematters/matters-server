import type { Connections } from '#definitions/index.js'

import _get from 'lodash/get.js'

import {
  AtomService,
  ArticleService,
  PaymentService,
} from '#connectors/index.js'
import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NODE_TYPES,
  PAYMENT_PROVIDER,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
} from '#common/enums/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'
import {
  getUserContext,
  testClient,
  genConnections,
  closeConnections,
} from '../utils.js'

let connections: Connections
beforeAll(async () => {
  connections = await genConnections()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
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
        donated
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
      pinned
      state
      license
      requestForDonation
      replyToDonator
      canComment
      indentFirstLine
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

    // empty string is not allowed
    const { errors: errorsEmptyString } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title: '',
        },
      },
    })
    expect(errorsEmptyString).toBeDefined()

    //  null same as empty string
    const { errors: errorsNull } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          title: null,
        },
      },
    })
    expect(errorsNull).toBeDefined()
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
    const { errors: errors1, data: resetData1 } = await server.executeOperation(
      {
        query: EDIT_ARTICLE,
        variables: {
          input: {
            id: articleGlobalId,
            summary: null,
          },
        },
      }
    )
    expect(errors1).toBeUndefined()
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
    // set tags out of limit
    const { errors: failedErrors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT + 1),
        },
      },
    })
    expect(failedErrors[0].extensions.code).toBe('TOO_MANY_TAGS_FOR_ARTICLE')

    // set tags within limit
    const { data: succeededData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT),
        },
      },
    })
    expect(succeededData.editArticle.tags.length).toBe(
      MAX_TAGS_PER_ARTICLE_LIMIT
    )
    expect(succeededData.editArticle.tags[0].content).toBe(tags[0])
    expect(succeededData.editArticle.tags[1].content).toBe(tags[1])
    expect(succeededData.editArticle.tags[2].content).toBe(tags[2])
    expect(succeededData.editArticle.revisionCount).toBe(1)

    // set same tags
    const { data: unchangedData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT),
        },
      },
    })
    expect(unchangedData.editArticle.revisionCount).toBe(
      succeededData.editArticle.revisionCount
    )

    // do not change tags when not in input
    const { data: otherData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(otherData.editArticle.tags.length).toBe(MAX_TAGS_PER_ARTICLE_LIMIT)
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
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT - 1),
        },
      },
    })
    expect(decreaseData.editArticle.tags.length).toBe(
      MAX_TAGS_PER_ARTICLE_LIMIT - 1
    )
    expect(decreaseData.editArticle.revisionCount).toBe(2)

    // increase tags
    const { data: increaseData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT),
        },
      },
    })
    expect(increaseData.editArticle.tags.length).toBe(
      MAX_TAGS_PER_ARTICLE_LIMIT
    )
    expect(increaseData.editArticle.revisionCount).toBe(3)

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
    // set connections within limit
    const { data, errors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT),
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.collection.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      data.editArticle.collection.edges[0].node.id,
      data.editArticle.collection.edges[1].node.id,
      data.editArticle.collection.edges[2].node.id,
    ]).toEqual(collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))
    expect(data.editArticle.revisionCount).toBe(1)

    // set same connections
    const { data: unchangedData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT),
        },
      },
    })
    expect(unchangedData.editArticle.revisionCount).toBe(
      data.editArticle.revisionCount
    )

    // set connections out of limit
    const { errors: failedErrors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: collection.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
    })
    expect(failedErrors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // do not change connections when not in input
    const { data: otherData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
        },
      },
    })
    expect(otherData.editArticle.collection.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      otherData.editArticle.collection.edges[0].node.id,
      otherData.editArticle.collection.edges[1].node.id,
      otherData.editArticle.collection.edges[2].node.id,
    ]).toEqual(collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))

    // reorder connections
    const reorderConnections = [
      ...collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT),
    ].reverse()
    expect(reorderConnections).not.toBe(
      collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT)
    )

    const { data: reorderData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: reorderConnections,
        },
      },
    })
    expect(reorderData.editArticle.collection.totalCount).toBe(
      reorderConnections.length
    )
    expect([
      reorderData.editArticle.collection.edges[0].node.id,
      reorderData.editArticle.collection.edges[1].node.id,
      reorderData.editArticle.collection.edges[2].node.id,
    ]).toEqual(reorderConnections)

    // decrease collection
    const { data: decreaseData } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: collection.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
          ),
        },
      },
    })

    expect(decreaseData.editArticle.collection.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
    )
    expect([
      decreaseData.editArticle.collection.edges[0].node.id,
      decreaseData.editArticle.collection.edges[1].node.id,
    ]).toEqual(collection.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT - 1))

    // reset connections
    const { data: resetData1 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: [],
        },
      },
    })
    expect(resetData1.editArticle.collection.totalCount).toBe(0)

    const { data: resetData2 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          collection: null,
        },
      },
    })
    expect(resetData2.editArticle.collection.totalCount).toBe(0)
  })

  test('toggle article pinned', async () => {
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
          pinned: true,
        },
      },
    })
    expect(_get(enableResult, 'data.editArticle.pinned')).toBe(true)

    const disableResult = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          pinned: false,
        },
      },
    })
    expect(_get(disableResult, 'data.editArticle.pinned')).toBe(false)
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

    // ignore license when null
    const { errors: errors3, data: data3 } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          license: null,
        },
      },
    })
    expect(errors3).toBeUndefined()
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
    expect(data4.node.donated).toBe(false)

    // donators can view replyToDonator
    const paymentService = new PaymentService(connections)
    await paymentService.createTransaction({
      amount: 1,
      state: TRANSACTION_STATE.pending,
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
    expect(data5.node.donated).toBe(true)
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
    expect(errors2).toBeDefined()

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
    const atomService = new AtomService(connections)
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: articleDbId },
    })
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
    const { data: archivedData, errors } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: article2Id,
          state: ARTICLE_STATE.archived,
        },
      },
    })
    expect(errors).toBeUndefined()
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
  test('edit indent setting', async () => {
    const server = await testClient({
      isAuth: true,
      connections,
    })
    const { errors, data } = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: articleGlobalId,
          indentFirstLine: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.editArticle.indentFirstLine).toBe(true)
  })
})

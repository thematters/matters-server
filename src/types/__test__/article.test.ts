import _get from 'lodash/get'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  NODE_TYPES,
  PUBLISH_STATE,
} from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLAppreciateArticleInput, GQLNodeInput } from 'definitions'

import { publishArticle, putDraft, testClient, updateUserState } from './utils'

const mediaHash = 'someIpfsMediaHash1'

const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })

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
      revisionCount
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

describe('publish article', () => {
  test('create a draft & publish it', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft })
    const { publishState } = await publishArticle({ id })
    expect(publishState).toBe(PUBLISH_STATE.pending)
  })

  test('create a draft & publish with iscn', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
      iscnPublish: true,
    }
    const resDraft = await putDraft({ draft })
    expect(_get(resDraft, 'id')).not.toBeNull()
    expect(_get(resDraft, 'iscnPublish')).toBe(true)

    const { publishState } = await publishArticle({ id: resDraft.id })
    expect(publishState).toBe(PUBLISH_STATE.pending)
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
    const tags = ['abc', '123']
    const server = await testClient({
      isAuth: true,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          tags,
        },
      },
    })
    expect(_get(result, 'data.editArticle.tags.length')).toBe(2)
    expect(_get(result, 'data.editArticle.tags.0.content')).toBe(tags[0])
    expect(_get(result, 'data.editArticle.tags.1.content')).toBe(tags[1])

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
    const collection = [
      toGlobalId({ type: NODE_TYPES.Article, id: 3 }),
      toGlobalId({ type: NODE_TYPES.Article, id: 4 }),
    ]
    const server = await testClient({
      isAuth: true,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          collection,
        },
      },
    })
    expect(_get(result, 'data.editArticle.collection.totalCount')).toBe(2)
    expect(
      [
        _get(result, 'data.editArticle.collection.edges.0.node.id'),
        _get(result, 'data.editArticle.collection.edges.1.node.id'),
      ].sort()
    ).toEqual(collection.sort())

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

  test('archive article', async () => {
    const server = await testClient({
      isAuth: true,
      isAdmin: false,
    })
    const result = await server.executeOperation({
      query: EDIT_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          state: ARTICLE_STATE.archived,
        },
      },
    })
    expect(_get(result, 'data.editArticle.state')).toBe(ARTICLE_STATE.archived)
  })
})

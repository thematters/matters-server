import _get from 'lodash/get'

import { ARTICLE_STATE, NODE_TYPES, PUBLISH_STATE } from 'common/enums'
import { toGlobalId } from 'common/utils'
import { GQLAppreciateArticleInput, GQLNodeInput } from 'definitions'

import { publishArticle, putDraft, testClient, updateUserState } from './utils'

const mediaHash = 'someIpfsMediaHash1'

const ARTICLE_ID = toGlobalId({ type: NODE_TYPES.Article, id: 1 })

const GET_ARTICLES = /* GraphQL */ `
  query($input: ConnectionArgs!) {
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
  query($input: NodeInput!) {
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
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        appreciationsReceivedTotal
      }
    }
  }
`

const APPRECIATE_ARTICLE = /* GraphQL */ `
  mutation($input: AppreciateArticleInput!) {
    appreciateArticle(input: $input) {
      appreciationsReceivedTotal
    }
  }
`

const TOGGLE_ARTICLE_LIVE = /* GraphQL */ `
  mutation($input: ToggleItemInput!) {
    toggleArticleLive(input: $input) {
      live
    }
  }
`

const TOGGLE_SUBSCRIBE_ARTICLE = /* GraphQL */ `
  mutation($input: ToggleItemInput!) {
    toggleSubscribeArticle(input: $input) {
      subscribed
    }
  }
`

const EDIT_ARTICLE = /* GraphQL */ `
  mutation($input: EditArticleInput!) {
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
    }
  }
`

const GET_RELATED_ARTICLES = /* GraphQL */ `
  query($input: ArticleInput!) {
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
  const { query } = await testClient()
  const { data } = await query({
    query: GET_ARTICLE_APPRECIATIONS_RECEIVED_TOTAL,
    // @ts-ignore
    variables: { input },
  })
  const { appreciationsReceivedTotal } = data && data.node && data.node
  return appreciationsReceivedTotal
}

export const appreciateArticle = async (input: GQLAppreciateArticleInput) => {
  const { mutate } = await testClient({
    isAuth: true,
  })
  const result = await mutate({
    mutation: APPRECIATE_ARTICLE,
    // @ts-ignore
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
    const { query } = await testClient({ isAuth: true, isAdmin: true })
    const result = await query({
      query: GET_ARTICLES,
      // @ts-ignore
      variables: { input: {} },
    })
    expect(_get(result, 'data.oss.articles.edges.length')).toBeGreaterThan(1)
  })

  test('query related articles', async () => {
    const { query } = await testClient()
    const result = await query({
      query: GET_RELATED_ARTICLES,
      // @ts-ignore
      variables: { input: { mediaHash } },
    })
    expect(_get(result, 'data.article.relatedArticles.edges')).toBeDefined()
  })
})

describe('query tag on article', () => {
  test('query tag on article', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Article, id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE_TAGS,
      // @ts-ignore
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
})

describe('toggle article state', () => {
  test('enable article live', async () => {
    const { mutate } = await testClient({ isAuth: true, isAdmin: true })
    const result = await mutate({
      mutation: TOGGLE_ARTICLE_LIVE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: true,
        },
      },
    })
    expect(_get(result, 'data.toggleArticleLive.live')).toBe(true)
  })

  test('disable article live', async () => {
    const { mutate } = await testClient({ isAuth: true, isAdmin: true })
    const result = await mutate({
      mutation: TOGGLE_ARTICLE_LIVE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: false,
        },
      },
    })
    expect(_get(result, 'data.toggleArticleLive.live')).toBe(false)
  })

  test('subscribe an article', async () => {
    const { mutate } = await testClient({ isAuth: true, isAdmin: true })
    const { data } = await mutate({
      mutation: TOGGLE_SUBSCRIBE_ARTICLE,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true, isAdmin: true })
    const { data } = await mutate({
      mutation: TOGGLE_SUBSCRIBE_ARTICLE,
      // @ts-ignore
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

  // make sure user state in db is correct
  beforeAll(async () => {
    await updateUserState({
      id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
      state: 'frozen',
    })
  })
  afterAll(async () => {
    await updateUserState({
      id: toGlobalId({ type: NODE_TYPES.User, id: 8 }),
      state: 'active',
    })
  })

  test('subscribe article', async () => {
    const { mutate } = await testClient(frozenUser)
    const result = await mutate({
      mutation: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: true,
        },
      },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
  })

  test('unsubscribe article', async () => {
    const { mutate } = await testClient(frozenUser)
    const result = await mutate({
      mutation: TOGGLE_SUBSCRIBE_ARTICLE,
      variables: {
        input: {
          id: ARTICLE_ID,
          enabled: false,
        },
      },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
  })

  test('create draft', async () => {
    const result = await putDraft({
      draft: {
        title: Math.random().toString(),
        content: Math.random().toString(),
      },
      client: { isFrozen: true },
    })
    expect(_get(result, errorPath)).toBe('FORBIDDEN_BY_STATE')
  })
})

describe('edit article', () => {
  test('edit article summary', async () => {
    const summary = 'my customized summary'
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const result = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const resetResult1 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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

    const resetResult2 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const result = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const resetResult1 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          tags: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.tags.length')).toBe(0)

    const resetResult2 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const result = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const resetResult1 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          collection: [],
        },
      },
    })
    expect(_get(resetResult1, 'data.editArticle.collection.totalCount')).toBe(0)

    const resetResult2 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const enableResult = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          sticky: true,
        },
      },
    })
    expect(_get(enableResult, 'data.editArticle.sticky')).toBe(true)

    const disableResult = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const result = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          license: 'CC_0',
        },
      },
    })
    expect(_get(result, 'data.editArticle.license')).toBe('CC_0')

    // forbid to ARR if it's not a paywalled article
    const errorPath = 'errors.0.extensions.code'
    const forbidResult = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          license: 'ARR',
        },
      },
    })
    expect(_get(forbidResult, errorPath)).toBe('FORBIDDEN')

    // reset license
    const resetResult1 = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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
  })

  test('archive article', async () => {
    const { mutate } = await testClient({ isAuth: true, isAdmin: false })
    const result = await mutate({
      mutation: EDIT_ARTICLE,
      // @ts-ignore
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

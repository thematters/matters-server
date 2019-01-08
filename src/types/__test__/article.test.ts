import _ from 'lodash'
// internal
import { toGlobalId } from 'common/utils'
import { PUBLISH_STATE } from 'common/enums'
import { knex } from 'connectors/db'
import {
  GQLNodeInput,
  GQLPublishArticleInput,
  GQLAppreciateArticleInput
} from 'definitions'
// local
import { testClient } from './utils'
import { putDraft } from './draft.test'
import { getViewerMAT } from './user.test'

afterAll(knex.destroy)

const ARTICLE_ID = toGlobalId({ type: 'Article', id: 2 })
const PUBLISH_ARTICLE = `
  mutation($input: PublishArticleInput!) {
    publishArticle(input: $input) {
      id
      publishState
      title
      content
      createdAt
    }
  }
`
const RECALL_PUBLISH = `
  mutation($input: RecallPublishInput!) {
    recallPublish(input: $input) {
      publishState
    }
  }
`

const GET_ARTICLE_BY_MEDIA_HASH = `
  query ($input: ArticleInput!) {
    article(input: $input) {
      mediaHash
    }
  }
`
const GET_ARTICLE_UPSTREAM = `
  query($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        id
        upstream {
          id
        }
      }
    }
  }
`
const GET_ARTICLE_TAGS = `
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
const GET_ARTICLE_MAT = `
  query ($input: NodeInput!) {
    node(input: $input) {
      ... on Article {
        MAT
      }
    }
  }
`
const APPRECIATE_ARTICLE = `
  mutation($input: AppreciateArticleInput!) {
    appreciateArticle(input: $input) {
      MAT
    }
  }
`
const REPORT_ARTICLE = `
  mutation($input: ReportArticleInput!) {
    reportArticle(input: $input)
  }
`

export const publishArticle = async (input: GQLPublishArticleInput) => {
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: PUBLISH_ARTICLE,
    // @ts-ignore
    variables: { input }
  })
  const article = result && result.data && result.data.publishArticle
  return article
}

export const getArticleMAT = async (input: GQLNodeInput) => {
  const { query } = await testClient()
  const { data } = await query({
    query: GET_ARTICLE_MAT,
    // @ts-ignore
    variables: { input }
  })
  const { MAT } = data && data.node && data.node
  return MAT
}

export const appreciateArticle = async (input: GQLAppreciateArticleInput) => {
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: APPRECIATE_ARTICLE,
    // @ts-ignore
    variables: { input }
  })

  if (result.errors) {
    throw result.errors
  }

  const article = result && result.data && result.data.appreciateArticle
  return article
}

describe('query article', async () => {
  test('query article by mediaHash', async () => {
    const mediaHash = 'some-ipfs-media-hash-1'
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE_BY_MEDIA_HASH,
      // @ts-ignore
      variables: { input: { mediaHash } }
    })
    expect(_.get(data, 'article.mediaHash')).toBe(mediaHash)
  })
})

describe('query tag and upstream on article', async () => {
  test('query tag on article', async () => {
    const id = toGlobalId({ type: 'Article', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE_TAGS,
      // @ts-ignore
      variables: { input: { id } }
    })
    const tags = data && data.node && data.node.tags
    expect(
      new Set(tags.map(({ content }: { content: string }) => content))
    ).toEqual(new Set(['article', 'test']))
  })

  test('query upstream on article', async () => {
    const id = toGlobalId({ type: 'Article', id: 2 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE_UPSTREAM,
      // @ts-ignore
      variables: { input: { id } }
    })
    const upstream = data && data.node && data.node.upstream
    expect(upstream.id).toEqual(toGlobalId({ type: 'Article', id: 1 }))
  })

  test('query null upstream on article', async () => {
    const id = toGlobalId({ type: 'Article', id: 1 })
    const { query } = await testClient()
    const { data } = await query({
      query: GET_ARTICLE_UPSTREAM,
      // @ts-ignore
      variables: { input: { id } }
    })
    const upstream = data && data.node && data.node.upstream
    expect(upstream).toBeNull()
  })
})

describe('publish article', async () => {
  test('create draft, publish and recall', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString()
    }
    const { id } = await putDraft(draft)
    const { publishState } = await publishArticle({ id })
    expect(publishState).toBe(PUBLISH_STATE.pending)

    const { mutate } = await testClient({
      isAuth: true
    })
    const result = await mutate({
      mutation: RECALL_PUBLISH,
      // @ts-ignore
      variables: { input: { id } }
    })
    const draftRecalled = result && result.data && result.data.recallPublish
    expect(draftRecalled.publishState).toBe(PUBLISH_STATE.recalled)
  })
})

describe('appreciate article', async () => {
  test('appreciate success', async () => {
    const viewerCurrentMAT = await getViewerMAT()
    const articleCurrentMAT = await getArticleMAT({ id: ARTICLE_ID })
    const appreciate = { id: ARTICLE_ID, amount: 1 }
    await appreciateArticle(appreciate)
    const viewerNewMAT = await getViewerMAT()
    const articleNewMAT = await getArticleMAT({ id: ARTICLE_ID })
    expect(viewerNewMAT).toBe(viewerCurrentMAT - appreciate.amount)
    // expect(articleNewMAT).toBe(articleCurrentMAT + appreciate.amount)
  })

  test('appreciate failed', async () => {
    const { totoal: viewerCurrentMAT } = await getViewerMAT()
    const appreciate = { id: ARTICLE_ID, amount: viewerCurrentMAT + 1 }
    try {
      await appreciateArticle(appreciate)
    } catch (e) {
      expect(() => {
        throw e
      }).toThrowError()
    }
  })
})

describe('report article', async () => {
  test('report a article without assets', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: REPORT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          category: 'spam'
        }
      }
    })
    expect(result.data.reportArticle).toBe(true)
  })

  test('report a article with assets', async () => {
    const { mutate } = await testClient({ isAuth: true })
    const result = await mutate({
      mutation: REPORT_ARTICLE,
      // @ts-ignore
      variables: {
        input: {
          id: ARTICLE_ID,
          category: 'spam',
          assetIds: ['00000000-0000-0000-0000-000000000011']
        }
      }
    })
    expect(result.data.reportArticle).toBe(true)
  })
})

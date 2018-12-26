// internal
import { toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import { GQLPublishArticleInput } from 'definitions'
// local
import { testClient } from './utils'
import { createDraft } from './draft.test'

afterAll(knex.destroy)

const PUBLISH_ARTICLE = `
  mutation($input: PublishArticleInput!) {
    publishArticle(input: $input) {
      id
      title
      content
      createdAt
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

test('create draft and publish', async () => {
  jest.setTimeout(10000)
  const draft = {
    title: Math.random().toString(),
    content: Math.random().toString()
  }
  const { id } = await createDraft(draft)
  const article = await publishArticle({ id })
  expect(article).toMatchObject(draft)
})

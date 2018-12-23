// external
import { graphql } from 'graphql'
// internal
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'
import { GQLPublishArticleInput } from 'definitions'
// local
import { authContext } from './utils'
import { createDraft } from './draft.test'

afterAll(knex.destroy)

export const publishArticle = async (input: GQLPublishArticleInput) => {
  const mutation = `
    mutation($input: PublishArticleInput!) {
      publishArticle(input: $input) {
        id
        title
        content
        createdAt
      }
    }
  `
  const context = await authContext()
  const result = await graphql(schema, mutation, {}, context, {
    input
  })
  const article = result && result.data && result.data.publishArticle

  return article
}

test('query tag on article', async () => {
  const id = toGlobalId({ type: 'Article', id: 1 })
  const query = `
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
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, query, {}, context, {
    input: { id }
  })
  const tags = data && data.node && data.node.tags
  expect(
    new Set(tags.map(({ content }: { content: string }) => content))
  ).toEqual(new Set(['article', 'test']))
})

test('query upstream on article', async () => {
  const id = toGlobalId({ type: 'Article', id: 2 })
  const query = `
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
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, query, {}, context, {
    input: { id }
  })
  const upstream = data && data.node && data.node.upstream
  expect(upstream.id).toEqual(toGlobalId({ type: 'Article', id: 1 }))
})

test('query null upstream on article', async () => {
  const id = toGlobalId({ type: 'Article', id: 1 })
  const query = `
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
  const context = await makeContext({ req: {} })
  const { data } = await graphql(schema, query, {}, context, {
    input: { id }
  })
  const upstream = data && data.node && data.node.upstream
  expect(upstream).toBeNull()
})

test.only('create draft and publish', async () => {
  const draft = {
    title: Math.random().toString(),
    content: Math.random().toString()
  }
  const { id } = await createDraft(draft)
  const article = await publishArticle({ id })
  expect(article).toMatchObject(draft)
})

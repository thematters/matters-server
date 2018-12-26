// external
import { graphql } from 'graphql'
// internal
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'
// local
import { authContext, delay } from './utils'
import { createDraft } from './draft.test'
import { publishArticle } from './article.test'

afterAll(knex.destroy)

describe('query nodes of different type', async () => {
  test('query user node', async () => {
    const id = toGlobalId({ type: 'User', id: 1 })
    const query = `
      query($input: NodeInput!) {
        node(input: $input) {
          ... on User {
            id
            info {
              email
            }
          }
        }
      }
    `
    const context = await makeContext({ req: {} })
    const { data } = await graphql(schema, query, {}, context, {
      input: { id }
    })
    const node = data && data.node
    expect(node).toMatchObject({ id, info: { email: 'test1@matters.news' } })
  })

  test('query article node', async () => {
    const id = toGlobalId({ type: 'Article', id: 1 })
    const query = `
      query($input: NodeInput!) {
        node(input: $input) {
          ... on Article {
            id
            title
          }
        }
      }
    `
    const context = await makeContext({ req: {} })
    const { data } = await graphql(schema, query, {}, context, {
      input: { id }
    })
    const node = data && data.node
    expect(node).toEqual({ id, title: 'test article 1' })
  })

  test('query comment node', async () => {
    const id = toGlobalId({ type: 'Comment', id: 1 })
    const query = `
      query($input: NodeInput!) {
        node(input: $input) {
          ... on Comment {
            id
            content
          }
        }
      }
    `
    const context = await makeContext({ req: {} })
    const { data } = await graphql(schema, query, {}, context, {
      input: { id }
    })
    const node = data && data.node
    expect(node).toEqual({ id, content: '<div>Test comment 1</div>' })
  })
})

describe('Search', async () => {
  test('create draft, publish and search', async () => {
    const draft = {
      title: Math.random().toString(),
      content: (Math.random() * 100).toString(),
      tags: ['test', 'article']
    }
    const { id } = await createDraft(draft)
    await publishArticle({ id })

    await delay(2000)

    const searchQuery = `
      query($input: SearchInput!) {
        search(input: $input) {
          match
          node {
            ... on Article {
              content
            }
          }
        }
      }
  `
    const context = await authContext()
    const result = await graphql(schema, searchQuery, {}, context, {
      input: {
        key: draft.content,
        type: 'Article',
        limit: 1
      }
    })

    const search = result && result.data && result.data.search
    const node = search && search[0] && search[0].node
    expect(node.content).toBe(draft.content)
  })
})

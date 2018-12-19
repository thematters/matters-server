// external
import { graphql } from 'graphql'
// local
import { makeContext, toGlobalId } from 'common/utils'
import { knex } from 'connectors/db'
import schema from '../../schema'

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

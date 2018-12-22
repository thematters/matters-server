// external
import { graphql } from 'graphql'
// local
import { knex } from 'connectors/db'
import schema from '../../schema'
import { authContext, testUser, login, loginQuery } from './utils'

afterAll(knex.destroy)

test('create new draft', async () => {
  const draft = {
    title: 'test',
    content: 'asds'
  }
  const mutation = `
      mutation($input: PutDraftInput!) {
        putDraft(input: $input) {
          upstream {
            id
          }
          title
          summary
          content
          createdAt
        }
      }
    `
  const context = await authContext()
  const result = await graphql(schema, mutation, {}, context, {
    input: draft
  })
  const putDraft = result && result.data && result.data.putDraft

  expect(putDraft).toMatchObject(draft)
})

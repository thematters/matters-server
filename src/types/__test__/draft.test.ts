// external
import { graphql } from 'graphql'
// local
import { knex } from 'connectors/db'
import schema from '../../schema'
import { authContext } from './utils'
import { GQLPutDraftInput } from 'definitions'

afterAll(knex.destroy)

export const createDraft = async (draft: GQLPutDraftInput) => {
  const mutation = `
    mutation($input: PutDraftInput!) {
      putDraft(input: $input) {
        id
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
  return putDraft
}

test('create new draft', async () => {
  const draft = {
    title: 'test',
    content: 'asds'
  }

  const draftCreated = await createDraft(draft)
  expect(draftCreated).toMatchObject(draft)
})

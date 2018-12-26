// local
import { knex } from 'connectors/db'
import { GQLPutDraftInput } from 'definitions'
import { testClient } from './utils'

afterAll(knex.destroy)

const PUT_DRAFT = `
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

export const createDraft = async (draft: GQLPutDraftInput) => {
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: PUT_DRAFT,
    // @ts-ignore
    variables: { input: draft }
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

// local
import { knex } from 'connectors/db'
import { GQLPutDraftInput, GQLPutAudioDraftInput } from 'definitions'
import { testClient } from './utils'

afterAll(knex.destroy)

const PUT_DRAFT = `
  mutation($input: PutDraftInput!) {
    putDraft(input: $input) {
      id
      upstream {
        id
      }
      cover
      title
      summary
      content
      createdAt
    }
  }
`
const PUT_AUDIO_DRAFT = `
  mutation($input: PutAudioDraftInput!) {
    putAudioDraft(input: $input) {
      id
      authorId
      title
      audio
      length
    }
  }
`

export const putDraft = async (draft: GQLPutDraftInput) => {
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

export const putAudioDraft = async (audioDraft: GQLPutAudioDraftInput) => {
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: PUT_AUDIO_DRAFT,
    // @ts-ignore
    variables: { input: audioDraft }
  })
  const putAudioDraft = result && result.data && result.data.putAudioDraft
  return putAudioDraft
}

describe('draft', async () => {
  test('create and edit new draft', async () => {
    // create
    const draft = {
      title: 'test',
      content: 'asds'
    }
    const draftCreated = await putDraft(draft)
    expect(draftCreated).toMatchObject(draft)

    // edit
    const editDraft = {
      id: draftCreated.id,
      content: 'edited content'
    }
    const draftEdited = await putDraft(editDraft)
    expect(draftEdited.content).toBe(editDraft.content)
  })

  test('create new draft with cover', async () => {
    const draft = {
      title: 'draft title with cover',
      content: 'draft content with cover',
      coverAssetId: '00000000-0000-0000-0000-000000000004'
    }
    const draftCreated = await putDraft(draft)
    expect(draftCreated.cover).toBeTruthy()
  })
})

describe('audio draft', async () => {
  test('create and edit new audio draft', async () => {
    // create
    const audioDraft = {
      title: 'audio draft',
      audioAssetId: '00000000-0000-0000-0000-000000000007',
      length: 30
    }
    const audioDraftCreated = await putAudioDraft(audioDraft)
    expect(audioDraftCreated).toMatchObject({
      title: audioDraft.title,
      length: audioDraft.length
    })
    expect(audioDraftCreated.audio).toBeTruthy()

    // edit
    const editAudioDraft = {
      id: audioDraftCreated.id,
      title: 'edited title'
    }
    const audioDraftEdited = await putAudioDraft(editAudioDraft)
    expect(audioDraftEdited.title).toBe(editAudioDraft.title)
  })
})

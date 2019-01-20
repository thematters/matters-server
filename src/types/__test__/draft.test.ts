// local
import { knex } from 'connectors/db'
import { GQLPutAudiodraftInput } from 'definitions'
import { testClient, putDraft } from './utils'

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
  mutation($input: PutAudiodraftInput!) {
    putAudiodraft(input: $input) {
      id
      authorId
      title
      audio
      length
    }
  }
`

export const putAudiodraft = async (Audiodraft: GQLPutAudiodraftInput) => {
  const { mutate } = await testClient({
    isAuth: true
  })
  const result = await mutate({
    mutation: PUT_AUDIO_DRAFT,
    // @ts-ignore
    variables: { input: Audiodraft }
  })
  const putAudiodraft = result && result.data && result.data.putAudiodraft
  return putAudiodraft
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
    const Audiodraft = {
      title: 'audio draft',
      audioAssetId: '00000000-0000-0000-0000-000000000007',
      length: 30
    }
    const AudiodraftCreated = await putAudiodraft(Audiodraft)
    expect(AudiodraftCreated).toMatchObject({
      title: Audiodraft.title,
      length: Audiodraft.length
    })
    expect(AudiodraftCreated.audio).toBeTruthy()

    // edit
    const editAudiodraft = {
      id: AudiodraftCreated.id,
      title: 'edited title'
    }
    const AudiodraftEdited = await putAudiodraft(editAudiodraft)
    expect(AudiodraftEdited.title).toBe(editAudiodraft.title)
  })
})

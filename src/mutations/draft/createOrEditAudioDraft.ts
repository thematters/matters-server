import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { audio, title, uuid } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const data: ItemData = {
    authorId: viewer.id,
    title,
    audio,
    length
  }

  // Edit an audo draft item
  if (typeof uuid === 'string') {
    return await draftService.baseUpdateByUUID(uuid, data, 'audio_draft')
  }
  // Create an audio draft item
  else {
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'audio_draft')
  }
}

export default resolver

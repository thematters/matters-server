import { v4 } from 'uuid'

import { ItemData, Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { audioAssetId, title, id, length } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const data: ItemData = {
    authorId: viewer.id,
    title,
    audio: audioAssetId,
    length
  }

  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    return await draftService.baseUpdateById(dbId, data, 'audio_draft')
  }
  // Create
  else {
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'audio_draft')
  }
}

export default resolver

import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id, audioAssetId, title, length } },
  { viewer, draftService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this')
  }

  const data: ItemData = {
    authorId: id ? undefined : viewer.id,
    title,
    audio: audioAssetId,
    length
  }

  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const draft = await draftService.baseFindById(dbId, 'audio_draft')
    if (!draft) {
      throw new Error('target audio draft does not exist')
    }
    if (draft.authorId !== viewer.id) {
      throw new Error('disallow to process')
    }
    return await draftService.baseUpdateById(dbId, data, 'audio_draft')
  }
  // Create
  else {
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'audio_draft')
  }
}

export default resolver

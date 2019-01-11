import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'

const resolver: Resolver = async (
  _,
  { input: { id: uuid, audioAssetId: audioAssetUUID, title, length } },
  { viewer, dataSources: { draftService, systemService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this')
  }

  let audioAssetId
  if (audioAssetUUID) {
    const asset = await systemService.findAssetByUUID(audioAssetUUID)
    if (!asset || asset.type !== 'audioDraft' || asset.authorId !== viewer.id) {
      throw new Error('Asset does not exists') // TODO
    }
    audioAssetId = asset.id
  }

  const data: ItemData = {
    authorId: uuid ? undefined : viewer.id,
    title,
    audio: audioAssetId,
    length
  }

  // Update
  if (uuid) {
    const draft = await draftService.baseFindByUUID(uuid, 'audio_draft')
    if (!draft) {
      throw new Error('target audio draft does not exist')
    }
    if (draft.authorId !== viewer.id) {
      throw new Error('disallow to process')
    }
    return await draftService.baseUpdateByUUID(uuid, data, 'audio_draft')
  }
  // Create
  else {
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'audio_draft')
  }
}

export default resolver

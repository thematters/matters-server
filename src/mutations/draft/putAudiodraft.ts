import { v4 } from 'uuid'

import {
  AssetNotFoundError,
  AudioDraftNotFoundError,
  AuthenticationError,
  ForbiddenError
} from 'common/errors'
import { ItemData, MutationToPutAudiodraftResolver } from 'definitions'

const resolver: MutationToPutAudiodraftResolver = async (
  _,
  { input: { id: uuid, audioAssetId: audioAssetUUID, title, length } },
  { viewer, dataSources: { draftService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let audioAssetId
  if (audioAssetUUID) {
    const asset = await systemService.findAssetByUUID(audioAssetUUID)
    if (!asset || asset.type !== 'audioDraft' || asset.authorId !== viewer.id) {
      throw new AssetNotFoundError('Asset does not exists')
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
      throw new AudioDraftNotFoundError('target audio draft does not exist')
    }
    if (draft.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
    return await draftService.baseUpdateByUUID(uuid, data, 'audio_draft')
  }
  // Create
  else {
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'audio_draft')
  }
}

export default resolver

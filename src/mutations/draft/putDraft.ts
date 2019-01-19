import {
  AuthenticationError,
  UserInputError,
  ForbiddenError
} from 'apollo-server'
import { v4 } from 'uuid'
import { ItemData, MutationToPutDraftResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToPutDraftResolver = async (
  _,
  {
    input: {
      id,
      upstreamId,
      title,
      content,
      tags,
      coverAssetId: coverAssetUUID
    }
  },
  { viewer, dataSources: { draftService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  let upstreamDBId
  if (upstreamId) {
    upstreamDBId = fromGlobalId(upstreamId).id
  }

  let coverAssetId
  if (coverAssetUUID) {
    const asset = await systemService.findAssetByUUID(coverAssetUUID)
    if (!asset || asset.type !== 'embed' || asset.authorId !== viewer.id) {
      throw new UserInputError('Asset does not exists') // TODO
    }
    coverAssetId = asset.id
  }

  const summary = content ? '' : undefined // TODO: Extract summary from html string
  const data: ItemData = {
    authorId: id ? undefined : viewer.id,
    upstreamId: upstreamDBId,
    title,
    summary,
    content,
    tags,
    cover: coverAssetId
  }

  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const draft = await draftService.dataloader.load(dbId)
    if (!draft) {
      throw new UserInputError('target draft does not exist')
    }
    if (draft.authorId != viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
    return await draftService.baseUpdate(dbId, data, 'draft')
  }
  // Create
  else {
    const draft = await draftService.baseCreate(
      { uuid: v4(), ...data },
      'draft'
    )
    return draft
  }
}

export default resolver

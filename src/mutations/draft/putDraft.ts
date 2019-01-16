import { AuthenticationError } from 'apollo-server'
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
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  let upstreamDBId
  if (upstreamId) {
    upstreamDBId = fromGlobalId(upstreamId).id
  }

  let coverAssetId
  if (coverAssetUUID) {
    const asset = await systemService.findAssetByUUID(coverAssetUUID)
    if (!asset || asset.type !== 'cover' || asset.authorId !== viewer.id) {
      throw new Error('Asset does not exists') // TODO
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
      throw new Error('target draft does not exist')
    }
    if (draft.authorId != viewer.id) {
      throw new Error('disallow to process')
    }
    return await draftService.baseUpdateById(dbId, data, 'draft')
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

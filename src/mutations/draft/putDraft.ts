import _ from 'lodash'
import { v4 } from 'uuid'
import { ItemData, MutationToPutDraftResolver } from 'definitions'
import { fromGlobalId, stripHtml, makeSummary, sanitize } from 'common/utils'
import {
  DraftNotFoundError,
  ForbiddenError,
  AssetNotFoundError,
  AuthenticationError
} from 'common/errors'

const resolver: MutationToPutDraftResolver = async (
  root,
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
      throw new AssetNotFoundError('Asset does not exists')
    }
    coverAssetId = asset.id
  }

  const data: ItemData = _.pickBy(
    {
      authorId: id ? undefined : viewer.id,
      upstreamId: upstreamDBId,
      title,
      summary: content && makeSummary(stripHtml(content)),
      content: content && sanitize(content),
      tags,
      cover: coverAssetId
    },
    _.identity
  )

  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const draft = await draftService.dataloader.load(dbId)
    if (!draft) {
      throw new DraftNotFoundError('target draft does not exist')
    }
    if (draft.authorId != viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
    return await draftService.baseUpdate(
      dbId,
      { updatedAt: new Date(), ...data },
      'draft'
    )
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

import { v4 } from 'uuid'
import { ItemData, Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  _,
  { input: { id, upstreamId, title, content, tags, coverAssetId } },
  { viewer, dataSources: { draftService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this')
  }

  let upstreamDBId
  if (upstreamId) {
    upstreamDBId = fromGlobalId(upstreamId).id
  }

  // TODO: Extract summary from html string
  const summary = content ? '' : undefined
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
    return await draftService.baseCreate({ uuid: v4(), ...data }, 'draft')
  }
}

export default resolver

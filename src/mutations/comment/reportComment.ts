import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id, category, description, assetIds } },
  { viewer, dataSources: { commentService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)
  if (!comment) {
    throw new Error('target comment does not exists') // TODO
  }

  await commentService.report(
    comment.id,
    viewer.id,
    category,
    description,
    assetIds
  )

  return true
}

export default resolver

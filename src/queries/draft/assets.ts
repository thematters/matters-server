import { isTarget } from 'common/utils'
import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id, authorId },
  _,
  { dataSources: { systemService }, req, viewer }
) => {
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (!isAdmin && !isAuthor) {
    return []
  }

  const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
    'draft'
  )
  const assets = await systemService.findAssetAndAssetMap({
    entityTypeId: draftEntityTypeId,
    entityId: id,
  })

  return assets.map((asset) => {
    return {
      ...asset,
      path: systemService.genAssetUrl(asset, !isTarget(req, viewer)),
    }
  })
}

export default resolver

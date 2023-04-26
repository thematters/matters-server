import { DraftToAssetsResolver } from 'definitions'

const resolver: DraftToAssetsResolver = async (
  { id, authorId },
  _,
  { viewer, dataSources: { systemService }, req }
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

  const useS3 = ![
    'https://web-develop.matters.town',
    'https://web-next.matters.town',
  ].includes(req.headers.Origin as string)

  return assets.map((asset) => {
    return {
      ...asset,
      path: systemService.genAssetUrl(asset, useS3),
    }
  })
}

export default resolver

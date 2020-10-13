import { ArticleToAssetsResolver } from 'definitions'

const resolver: ArticleToAssetsResolver = async (
  { id, draftId },
  _,
  { dataSources: { systemService } }
) => {
  // assets belonged to this article
  const { id: articleEntityTypeId } = await systemService.baseFindEntityTypeId(
    'article'
  )
  const articleAssets = await systemService.findAssetAndAssetMap({
    entityTypeId: articleEntityTypeId,
    entityId: id,
  })

  // assets belonged to linked latest draft
  let draftAssets: any[] = []
  if (draftId) {
    const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
      'draft'
    )
    draftAssets = await systemService.findAssetAndAssetMap({
      entityTypeId: draftEntityTypeId,
      entityId: draftId,
    })
  }

  const assets = [...articleAssets, ...draftAssets].map((asset) => {
    return {
      ...asset,
      path: asset.path ? `${systemService.aws.s3Endpoint}/${asset.path}` : null,
    }
  })

  return assets
}

export default resolver

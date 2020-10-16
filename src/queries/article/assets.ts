import { ArticleToAssetsResolver } from 'definitions'

const resolver: ArticleToAssetsResolver = async (
  { id, articleId },
  _,
  { dataSources: { systemService } }
) => {
  // assets belonged to this article
  const { id: articleEntityTypeId } = await systemService.baseFindEntityTypeId(
    'article'
  )
  const articleAssets = await systemService.findAssetAndAssetMap({
    entityTypeId: articleEntityTypeId,
    entityId: articleId,
  })

  // assets belonged to linked latest draft
  let draftAssets: any[] = []
  if (id) {
    const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
      'draft'
    )
    draftAssets = await systemService.findAssetAndAssetMap({
      entityTypeId: draftEntityTypeId,
      entityId: id,
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

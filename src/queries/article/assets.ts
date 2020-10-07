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
  const articleAssetMap = await systemService.findAssetAndAssetMap(
    articleEntityTypeId,
    id
  )

  // assets belonged to linked latest draft
  let draftAssetMap: any[] = []
  if (draftId) {
    const { id: draftEntityTypeId } = await systemService.baseFindEntityTypeId(
      'draft'
    )
    draftAssetMap = await systemService.findAssetAndAssetMap(
      draftEntityTypeId,
      draftId
    )
  }

  const assets = [...articleAssetMap, ...draftAssetMap].map((asset) => {
    return {
      ...asset,
      path: asset.path ? `${systemService.aws.s3Endpoint}/${asset.path}` : null,
    }
  })

  return assets
}

export default resolver

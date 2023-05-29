import { ArticleToAssetsResolver } from 'definitions'

const resolver: ArticleToAssetsResolver = async (
  { id, authorId, articleId },
  _,
  { viewer, dataSources: { systemService } }
) => {
  // Check inside resolver instead of `@auth(mode: "${AUTH_MODE.oauth}")`
  // since `@auth` now only supports scope starting with `viewer`.
  const isAuthor = authorId === viewer.id
  if (!isAuthor) {
    return []
  }

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

  const assets = [...articleAssets, ...draftAssets].map((asset) => ({
    ...asset,
    path: systemService.genAssetUrl(asset),
  }))

  return assets
}

export default resolver

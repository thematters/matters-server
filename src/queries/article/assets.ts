import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['assets'] = async (
  { id, authorId },
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
    entityId: id,
  })

  const assets = articleAssets.map((asset: any) => ({
    ...asset,
    path: systemService.genAssetUrl(asset),
  }))

  return assets
}

export default resolver

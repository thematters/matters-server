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
  return systemService.findAssetAndAssetMap({
    entityTypeId: articleEntityTypeId,
    entityId: id,
  })
}

export default resolver

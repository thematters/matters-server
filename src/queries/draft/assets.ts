import type { GQLDraftResolvers } from 'definitions'

const resolver: GQLDraftResolvers['assets'] = async (
  { id, authorId },
  _,
  { viewer, dataSources: { systemService } }
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

  return assets.map((asset: any) => ({
    ...asset,
    path: systemService.genAssetUrl(asset),
  }))
}

export default resolver

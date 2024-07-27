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

  return systemService.findAssetAndAssetMap({
    entityTypeId: draftEntityTypeId,
    entityId: id,
  })
}

export default resolver

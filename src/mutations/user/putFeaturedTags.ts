import { AuthenticationError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToPutFeaturedTagsResolver } from 'definitions'

const resolver: MutationToPutFeaturedTagsResolver = async (
  _,
  { input: { ids } },
  { viewer, dataSources: { systemService, tagService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const dbIds = ids.filter(Boolean).map((id: string) => fromGlobalId(id).id)

  const entry = await systemService.baseUpdateOrCreate({
    table: 'user_tags_order',
    where: { userId: viewer.id },
    data: { userId: viewer.id, tagIds: dbIds },
    updateUpdatedAt: true,
  })

  return tagService.dataloader.loadMany(entry.tagIds)
}

export default resolver

import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putFeaturedTags'] = async (
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

  return tagService.loadByIds(entry.tagIds)
}

export default resolver

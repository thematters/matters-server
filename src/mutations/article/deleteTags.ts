import { CACHE_PREFIX, NODE_TYPES } from 'common/enums'
import { fromGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { MutationToDeleteTagsResolver } from 'definitions'

const resolver: MutationToDeleteTagsResolver = async (
  root,
  { input: { ids } },
  { viewer, dataSources: { tagService }, redis }
) => {
  const tagDbIds = ids.map(id => fromGlobalId(id).id)
  await tagService.deleteTags(tagDbIds)
  await Promise.all(tagDbIds.map((id: string) => tagService.deleteSearch({ id })))

  // manually invalidate cache since it returns nothing
  if (redis && redis.client) {
    const cacheService = new CacheService(redis)
    await Promise.all(
      tagDbIds.map(id => cacheService.invalidate(NODE_TYPES.tag, id))
    )
  }

  return true
}

export default resolver

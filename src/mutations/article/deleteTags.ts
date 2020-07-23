import { NODE_TYPES } from 'common/enums'
import { fromGlobalId } from 'common/utils'
import { CacheService } from 'connectors'
import { MutationToDeleteTagsResolver } from 'definitions'

const resolver: MutationToDeleteTagsResolver = async (
  root,
  { input: { ids } },
  { viewer, dataSources: { tagService } }
) => {
  const tagDbIds = ids.map((id) => fromGlobalId(id).id)
  await tagService.deleteTags(tagDbIds)
  await Promise.all(
    tagDbIds.map((id: string) => tagService.deleteSearch({ id }))
  )

  // manually invalidate cache since it returns nothing
  const cacheService = new CacheService()
  await Promise.all(
    tagDbIds.map((id) => cacheService.invalidateFQC(NODE_TYPES.tag, id))
  )

  return true
}

export default resolver

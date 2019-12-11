import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToMergeTagsResolver } from 'definitions'

const resolver: MutationToMergeTagsResolver = async (
  root,
  { input: { ids, content } },
  { viewer, dataSources: { tagService, userService } }
) => {
  // assign Matty as tag's editor
  const mattyUser = await userService.findByEmail('hi@matters.news')
  if (!mattyUser) {
    throw new UserNotFoundError('could not find Matty')
  }
  const tagDbIds = ids.map(id => fromGlobalId(id).id)
  const newTag = await tagService.mergeTags({
    tagIds: tagDbIds,
    content,
    editors: [mattyUser.id]
  })

  // Add custom data for cache invalidation
  newTag[CACHE_KEYWORD] = tagDbIds.map(id => ({ id, type: NODE_TYPES.tag }))
  return newTag
}

export default resolver

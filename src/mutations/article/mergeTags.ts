import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToMergeTagsResolver } from 'definitions'

const resolver: MutationToMergeTagsResolver = async (
  root,
  { input: { ids, content } },
  { viewer, dataSources: { tagService, userService } }
) => {
  // assign Matty as tag's editor
  if (!environment.mattyId) {
    throw new UserNotFoundError('could not find Matty')
  }
  const tagDbIds = ids.map((id) => fromGlobalId(id).id)
  const newTag = await tagService.mergeTags({
    tagIds: tagDbIds,
    content,
    creator: environment.mattyId,
    editors: [environment.mattyId],
    owner: environment.mattyId,
  })

  // invalidate extra nodes
  newTag[CACHE_KEYWORD] = tagDbIds.map((id) => ({ id, type: NODE_TYPES.tag }))
  return newTag
}

export default resolver

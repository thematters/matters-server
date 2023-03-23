import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums/index.js'
import { environment } from 'common/environment.js'
import { UserNotFoundError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToMergeTagsResolver } from 'definitions'

const resolver: MutationToMergeTagsResolver = async (
  root,
  { input: { ids, content } },
  { viewer, dataSources: { atomService, tagService, userService } }
) => {
  // assign Matty as tag's editor
  if (!environment.mattyId) {
    throw new UserNotFoundError('could not find Matty')
  }
  const tagIds = ids.map((id) => fromGlobalId(id).id)
  const newTag = await tagService.mergeTags({
    tagIds,
    content,
    creator: environment.mattyId,
    editors: [environment.mattyId],
    owner: environment.mattyId,
  })

  await Promise.all(
    tagIds.map((id: string) => atomService.deleteSearch({ table: 'tag', id }))
  )

  // invalidate extra nodes
  newTag[CACHE_KEYWORD] = tagIds.map((id) => ({ id, type: NODE_TYPES.Tag }))
  return newTag
}

export default resolver

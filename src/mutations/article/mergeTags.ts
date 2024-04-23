import type { GQLMutationResolvers, Tag } from 'definitions'

import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { environment } from 'common/environment'
import { UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['mergeTags'] = async (
  _,
  { input: { ids, content } },
  { dataSources: { tagService } }
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

  // invalidate extra nodes
  ;(newTag as Tag & { [CACHE_KEYWORD]: any })[CACHE_KEYWORD] = tagIds.map(
    (id) => ({ id, type: NODE_TYPES.Tag })
  )
  return newTag
}

export default resolver

import { TagNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { TagToIsFollowerResolver } from 'definitions'

const resolver: TagToIsFollowerResolver = async (
  { id },
  _,
  { viewer, dataSources: { tagService, userService } }
) => {
  const tagId = fromGlobalId(id).id

  if (!tagId) {
    throw new TagNotFoundError('Cannot find tag by a given input')
  }

  if (!viewer.id) {
    return false
  }

  return userService.isFollowing({
    userId: viewer.id,
    targetId: tagId,
  })
}

export default resolver

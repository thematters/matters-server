import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import {
  ActionFailedError,
  AuthenticationError,
  TagNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleFollowTagResolver } from 'definitions'

const resolver: MutationToToggleFollowTagResolver = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { tagService, userService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const tag = await tagService.dataloader.load(dbId)

  if (!tag) {
    throw new TagNotFoundError('target user does not exists')
  }

  // determine action
  let action: 'follow' | 'unfollow'
  if (enabled === undefined) {
    const isFollowing = await userService.isFollowing({
      userId: viewer.id,
      targetId: tag.id,
    })
    action = !!isFollowing ? 'unfollow' : 'follow'
  } else {
    action = enabled ? 'follow' : 'unfollow'
  }

  // run action
  if (action === 'follow') {
    await userService.follow(viewer.id, tag.id)
  } else {
    await userService.unfollow(viewer.id, tag.id)
  }

  // Add custom data for cache invalidation
  tag[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.user,
    },
    {
      id: tag.id,
      type: NODE_TYPES.tag,
    },
  ]

  return tag
}

export default resolver

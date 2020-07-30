import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import {
  ActionFailedError,
  AuthenticationError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleFollowUserResolver } from 'definitions'

const resolver: MutationToToggleFollowUserResolver = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)

  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  if (viewer.id === dbId) {
    throw new ActionFailedError('cannot follow or unfollow yourself')
  }

  // determine action
  let action: 'follow' | 'unfollow'
  if (enabled === undefined) {
    const isFollowing = await userService.isFollowing({
      userId: viewer.id,
      targetId: user.id,
    })
    action = !!isFollowing ? 'unfollow' : 'follow'
  } else {
    action = enabled ? 'follow' : 'unfollow'
  }

  // run action
  if (action === 'follow') {
    await userService.follow(viewer.id, user.id)

    // trigger notificaiton
    notificationService.trigger({
      event: 'user_new_follower',
      actorId: viewer.id,
      recipientId: user.id,
    })
  } else {
    await userService.unfollow(viewer.id, user.id)
  }

  return user
}

export default resolver

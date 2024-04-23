import type { GQLMutationResolvers } from 'definitions'

import {
  CACHE_KEYWORD,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  USER_STATE,
} from 'common/enums'
import {
  ActionFailedError,
  ForbiddenError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleFollowUser'] = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { userService, notificationService, atomService } }
) => {
  // checks
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const user = await atomService.userIdLoader.load(dbId)

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
    action = isFollowing ? 'unfollow' : 'follow'
  } else {
    action = enabled ? 'follow' : 'unfollow'
  }

  // run action
  if (action === 'follow') {
    if (user.state === USER_STATE.frozen) {
      throw new ForbiddenByTargetStateError(`cannot follow ${user.state} user`)
    }

    await userService.follow(viewer.id, user.id)

    // trigger notificaiton
    notificationService.trigger({
      event: DB_NOTICE_TYPE.user_new_follower,
      actorId: viewer.id,
      recipientId: user.id,
    })
  } else {
    await userService.unfollow(viewer.id, user.id)
  }

  // invalidate extra nodes
  // @ts-ignore
  user[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return user
}

export default resolver

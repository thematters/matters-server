import type { GQLMutationResolvers } from '#definitions/index.js'

import { NOTICE_TYPE, NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import {
  ForbiddenError,
  ForbiddenByStateError,
  ForbiddenByTargetStateError,
  UserNotFoundError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLMutationResolvers['toggleFollowUser'] = async (
  _,
  { input: { id, enabled } },
  {
    viewer,
    dataSources: {
      userService,
      notificationService,
      atomService,
      connections: { redis },
    },
  }
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
  const noticeTag = `follow-user:${viewer.id}:${user.id}`
  if (action === 'follow') {
    if (user.state === USER_STATE.frozen) {
      throw new ForbiddenByTargetStateError(`cannot follow ${user.state} user`)
    }

    await userService.follow(viewer.id, user.id)

    notificationService.trigger({
      event: NOTICE_TYPE.user_new_follower,
      actorId: viewer.id,
      recipientId: user.id,
      tag: noticeTag,
    })
  } else {
    await userService.unfollow(viewer.id, user.id)
    notificationService.withdraw(noticeTag)
  }

  await invalidateFQC({
    node: { type: NODE_TYPES.User, id: viewer.id },
    redis: redis,
  })

  return user
}

export default resolver

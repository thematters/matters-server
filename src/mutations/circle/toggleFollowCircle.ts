import type { GQLMutationResolvers, Circle } from 'definitions'

import {
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  NOTICE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import {
  CircleNotFoundError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

// local enums
enum ACTION {
  follow = 'follow',
  unfollow = 'unfollow',
}

const resolver: GQLMutationResolvers['toggleFollowCircle'] = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService, systemService, notificationService } }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (typeof enabled !== 'boolean') {
    throw new UserInputError('parameter "enabled" is required')
  }

  // check feature is enabled or not
  const feature = await systemService.getFeatureFlag('circle_interact')
  if (
    feature &&
    !(await systemService.isFeatureEnabled(feature.flag, viewer))
  ) {
    throw new ForbiddenError('viewer has no permission')
  }

  const action = enabled ? ACTION.follow : ACTION.unfollow
  const { id: circleId } = fromGlobalId(id || '')
  const circle = await atomService.findFirst({
    table: 'circle',
    where: { id: circleId, state: CIRCLE_STATE.active },
  })

  if (!circle) {
    throw new CircleNotFoundError(`ciircle ${circleId} not found`)
  }

  switch (action) {
    case ACTION.follow: {
      const hasFollow = await atomService.count({
        table: 'action_circle',
        where: {
          action: CIRCLE_ACTION.follow,
          userId: viewer.id,
          targetId: circleId,
        },
      })

      if (hasFollow === 0) {
        await atomService.create({
          table: 'action_circle',
          data: {
            action: CIRCLE_ACTION.follow,
            userId: viewer.id,
            targetId: circleId,
          },
        })

        // trigger notificaiton
        notificationService.trigger({
          event: NOTICE_TYPE.circle_new_follower,
          actorId: viewer.id,
          recipientId: circle.owner,
          entities: [{ type: 'target', entityTable: 'circle', entity: circle }],
        })
      }
      break
    }
    case ACTION.unfollow: {
      await atomService.deleteMany({
        table: 'action_circle',
        where: {
          action: CIRCLE_ACTION.follow,
          userId: viewer.id,
          targetId: circleId,
        },
      })
      break
    }
  }

  // invalidate cache
  ;(circle as Circle & { [CACHE_KEYWORD]: any })[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return circle
}

export default resolver

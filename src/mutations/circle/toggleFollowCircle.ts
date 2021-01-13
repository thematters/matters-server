import { CACHE_KEYWORD, CIRCLE_ACTION, NODE_TYPES } from 'common/enums'
import {
  AuthenticationError,
  CircleNotFoundError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleFollowCircleResolver } from 'definitions'

// local enums
enum ACTION {
  follow = 'follow',
  unfollow = 'unfollow',
}

const resolver: MutationToToggleFollowCircleResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('parameter "enabled" is required')
  }

  const action = enabled ? ACTION.follow : ACTION.unfollow
  const { id: circleId } = fromGlobalId(id || '')
  const circle = await atomService.findUnique({
    table: 'circle',
    where: { id: circleId },
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
  circle[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.user,
    },
  ]

  return circle
}

export default resolver

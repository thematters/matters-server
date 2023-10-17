import type { GQLMutationResolvers } from 'definitions'

import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import {
  ActionFailedError,
  AuthenticationError,
  UserNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleBlockUser'] = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { userService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)

  if (viewer.id === dbId) {
    throw new ActionFailedError('cannot block yourself')
  }

  const user = await userService.loadById(dbId)
  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  // determine action
  let action: 'block' | 'unblock'
  if (enabled === undefined) {
    const blocked = await userService.blocked({
      userId: viewer.id,
      targetId: user.id,
    })
    action = blocked ? 'unblock' : 'block'
  } else {
    action = enabled ? 'block' : 'unblock'
  }

  // run action
  await (action === 'block'
    ? userService.block(viewer.id, user.id)
    : userService.unblock(viewer.id, user.id))

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

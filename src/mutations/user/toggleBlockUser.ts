import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums/index.js'
import {
  ActionFailedError,
  AuthenticationError,
  UserNotFoundError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToToggleBlockUserResolver } from 'definitions'

const resolver: MutationToToggleBlockUserResolver = async (
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

  const user = await userService.dataloader.load(dbId)
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
    action = !!blocked ? 'unblock' : 'block'
  } else {
    action = enabled ? 'block' : 'unblock'
  }

  // run action
  if (action === 'block') {
    await userService.block(viewer.id, user.id)
  } else {
    await userService.unblock(viewer.id, user.id)
  }

  // invalidate extra nodes
  user[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]

  return user
}

export default resolver

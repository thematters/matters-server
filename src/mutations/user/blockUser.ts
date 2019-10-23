import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import {
  ActionFailedError,
  AuthenticationError,
  UserNotFoundError
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToBlockUserResolver } from 'definitions'

const resolver: MutationToBlockUserResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService } }
) => {
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

  await userService.block(viewer.id, user.id)

  // Add custom data for cache invalidation
  user[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.user
    },
    {
      id: user.id,
      type: NODE_TYPES.user
    }
  ]

  return user
}

export default resolver

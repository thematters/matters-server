import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { AuthenticationError, UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnblockUserResolver } from 'definitions'

const resolver: MutationToUnblockUserResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)

  if (!user) {
    throw new UserNotFoundError('target user does not exists')
  }

  await userService.unblock(viewer.id, user.id)

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

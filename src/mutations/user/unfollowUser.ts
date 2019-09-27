import { AuthenticationError, UserNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToUnfollowUserResolver } from 'definitions'

const resolver: MutationToUnfollowUserResolver = async (
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

  await userService.unfollow(viewer.id, user.id)
  return user
}

export default resolver

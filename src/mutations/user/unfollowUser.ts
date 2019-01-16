import { AuthenticationError, UserInputError } from 'apollo-server'
import { MutationToUnfollowUserResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

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
    throw new UserInputError('target user does not exists')
  }

  await userService.unfollow(viewer.id, user.id)
  return true
}

export default resolver

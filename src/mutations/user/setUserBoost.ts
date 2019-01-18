import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToSetUserBoostResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToSetUserBoostResolver = async (
  root,
  { input: { id, boost } },
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.role !== 'admin') {
    throw new AuthenticationError('only admin can do this')
  }

  console.log(id, boost)

  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)
  if (!user) {
    throw new ForbiddenError('target user does not exists')
  }

  await userService.setBoost({ userId: dbId, boost })

  return user
}

export default resolver

import { Resolver } from 'definitions'

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return false
  }
  return await userService.isFollowing({
    userId: id,
    targetId: viewer.id
  })
}

export default resolver

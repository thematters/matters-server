import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { viewer, userService }) => {
  if (!viewer) {
    return false
  }
  return await userService.isFollowing({
    userId: id,
    targetId: viewer.id
  })
}

export default resolver

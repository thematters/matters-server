import type { GQLUserResolvers } from 'definitions'

const resolver: GQLUserResolvers['isFollower'] = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return false
  }
  return userService.isFollowing({
    userId: id,
    targetId: viewer.id,
  })
}

export default resolver

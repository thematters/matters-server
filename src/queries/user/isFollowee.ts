import type { GQLUserResolvers } from 'definitions'

const resolver: GQLUserResolvers['isFollowee'] = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return false
  }
  return userService.isFollowing({
    userId: viewer.id,
    targetId: id,
  })
}

export default resolver

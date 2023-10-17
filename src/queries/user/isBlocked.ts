import type { GQLUserResolvers } from 'definitions'

const resolver: GQLUserResolvers['isBlocked'] = async (
  { id },
  _,
  { viewer, dataSources: { userService } }
) => {
  if (!viewer.id) {
    return false
  }
  return userService.blocked({
    userId: viewer.id,
    targetId: id,
  })
}

export default resolver

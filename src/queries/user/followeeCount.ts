import { UserStatusToFolloweeCountResolver } from 'definitions'

const resolver: UserStatusToFolloweeCountResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countFollowees(id)

export default resolver

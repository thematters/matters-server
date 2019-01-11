import { UserStatusToFollowerCountResolver } from 'definitions'

const resolver: UserStatusToFollowerCountResolver = async (
  { id },
  _,
  { dataSources: { userService } }
) => userService.countFollowers(id)

export default resolver

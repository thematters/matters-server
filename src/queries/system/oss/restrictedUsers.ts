import { connectionFromArray, fromConnectionArgs } from 'common/utils'
import { OSSToRestrictedUsersResolver } from 'definitions'

export const restrictedUsers: OSSToRestrictedUsersResolver = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const [users, totalCount] = await userService.findRestrictedUsersAndCount({
    take,
    skip,
  })
  return connectionFromArray(users, input, totalCount)
}

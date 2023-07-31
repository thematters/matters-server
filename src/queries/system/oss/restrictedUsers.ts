import type { GQLOSSResolvers } from 'definitions'

import { connectionFromArray, fromConnectionArgs } from 'common/utils'

export const restrictedUsers: GQLOSSResolvers['restrictedUsers'] = async (
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

import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'

export const restrictedUsers: GQLOssResolvers['restrictedUsers'] = async (
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

import type { GQLOssResolvers } from '#definitions/index.js'

import { connectionFromArray, fromConnectionArgs } from '#common/utils/index.js'

export const momentFeedUsers: GQLOssResolvers['momentFeedUsers'] = async (
  _,
  { input },
  { dataSources: { momentService } }
) => {
  const { take, skip } = fromConnectionArgs(input)
  const [users, totalCount] = await momentService.findMomentFeedUsersAndCount({
    states: input.states ?? undefined,
    take,
    skip,
  })
  return connectionFromArray(users, input, totalCount)
}

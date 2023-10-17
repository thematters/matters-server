import type { GQLOssResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const users: GQLOssResolvers['users'] = async (
  _,
  { input },
  { dataSources: { userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.baseCount()

  return connectionFromPromisedArray(
    userService.baseFind({ skip, take }),
    input,
    totalCount
  )
}

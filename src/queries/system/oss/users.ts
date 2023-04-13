import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { OSSToUsersResolver } from 'definitions'

export const users: OSSToUsersResolver = async (
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

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { OSSToUsersResolver } from 'definitions'

export const users: OSSToUsersResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const { take, skip } = fromConnectionArgs(input)

  const totalCount = await userService.baseCount()

  return connectionFromPromisedArray(
    userService.baseFind({ skip, take }),
    input,
    totalCount
  )
}

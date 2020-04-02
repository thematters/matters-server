import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToUsersResolver } from 'definitions'

export const users: OSSToUsersResolver = async (
  root,
  { input },
  { viewer, dataSources: { userService } }
) => {
  const { first, after } = input
  const offset = cursorToIndex(after) + 1
  const totalCount = await userService.baseCount()

  return connectionFromPromisedArray(
    userService.baseFind({
      offset,
      limit: first,
    }),
    input,
    totalCount
  )
}

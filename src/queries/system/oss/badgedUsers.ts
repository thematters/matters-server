import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToBadgedUsersResolver } from 'definitions'

export const badgedUsers: OSSToBadgedUsersResolver = async (
  root,
  { input },
  { viewer, dataSources: { atomService } }
) => {
  const { first: take, after, type } = input
  const skip = cursorToIndex(after) + 1

  const table = 'user_badge'
  const countQuery = atomService.count({ table, where: { type } })
  const usersQuery = atomService.findMany({
    table,
    where: { type },
    skip,
    take,
    orderBy: [{ column: 'created_at', order: 'desc' }],
  })
  const [totalCount, users] = await Promise.all([countQuery, usersQuery])

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(users.map(({ userId }) => userId)),
    input,
    totalCount
  )
}

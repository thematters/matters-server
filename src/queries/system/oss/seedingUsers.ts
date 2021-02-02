import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { OSSToSeedingUsersResolver } from 'definitions'

export const seedingUsers: OSSToSeedingUsersResolver = async (
  root,
  { input },
  { viewer, dataSources: { atomService, userService } }
) => {
  const { first: take, after } = input
  const skip = cursorToIndex(after) + 1

  const table = 'seeding_user'
  const countQuery = atomService.count({ table, where: {} })
  const usersQuery = atomService.findMany({
    table,
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

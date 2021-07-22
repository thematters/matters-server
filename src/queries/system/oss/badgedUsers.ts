import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'
import { OSSToBadgedUsersResolver } from 'definitions'

export const badgedUsers: OSSToBadgedUsersResolver = async (
  root,
  { input },
  { viewer, dataSources: { atomService }, knex }
) => {
  const { type } = input
  const { take, skip } = fromConnectionArgs(input)

  const table = 'user_badge'

  const countQuery = knex.countDistinct('user_id').from(table).first()
  let usersQuery = knex
    .select()
    .from(table)
    .orderBy([{ column: 'created_at', order: 'desc' }])
    .as('badged_users')

  if (type) {
    countQuery.where({ type })
    usersQuery.where({ type })
  }

  if (skip) {
    usersQuery.offset(skip)
  }

  if (take) {
    usersQuery.limit(take)
  }

  usersQuery = knex.select('user_id').from(usersQuery).groupBy('user_id')

  const [countResult, users] = await Promise.all([countQuery, usersQuery])
  const totalCount = parseInt(
    countResult ? (countResult.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    atomService.userIdLoader.loadMany(users.map(({ userId }) => userId)),
    input,
    totalCount
  )
}

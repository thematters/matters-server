import type { GQLOssResolvers } from 'definitions'

import { connectionFromPromisedArray, fromConnectionArgs } from 'common/utils'

export const badgedUsers: GQLOssResolvers['badgedUsers'] = async (
  _,
  { input },
  {
    dataSources: {
      userService,
      connections: { knex },
    },
  }
) => {
  const { type } = input
  const { take, skip } = fromConnectionArgs(input)

  const table = 'user_badge'

  const countQuery = knex
    .countDistinct('user_id')
    .from(table)
    .where({ enabled: true })
    .first()
  let usersQuery = knex
    .select()
    .from(table)
    .where({ enabled: true })
    .orderBy([{ column: 'created_at', order: 'desc' }])
    .as('badged_users')

  if (type) {
    const dbType = (type?.startsWith('nomad') ? 'nomad' : type) as string
    countQuery.where({ type: dbType })
    usersQuery.where({ type: dbType })
  }

  if (skip) {
    usersQuery.offset(skip)
  }

  if (take || take === 0) {
    usersQuery.limit(take)
  }

  usersQuery = knex.select('user_id').from(usersQuery).groupBy('user_id')

  const [countResult, users] = await Promise.all([countQuery, usersQuery])
  const totalCount = parseInt(
    countResult ? (countResult.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(
    userService.loadByIds(users.map(({ userId }) => userId)),
    input,
    totalCount
  )
}

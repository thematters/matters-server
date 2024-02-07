import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleSeedingUsers'] = async (
  _,
  { input: { ids, enabled } },
  { dataSources: { atomService } }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('"enabled" is required')
  }

  const table = 'seeding_user'
  const userIds = ids.map((id) => fromGlobalId(id).id)

  await (enabled
    ? Promise.all(
        userIds.map((id) => atomService.create({ table, data: { userId: id } }))
      )
    : atomService.deleteMany({ table, whereIn: ['user_id', userIds] }))

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver

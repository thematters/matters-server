import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { GQLMutationResolvers } from 'definitions'

const resolver: GQLMutationResolvers['toggleUsersBadge'] = async (
  _,
  { input: { ids, type, enabled } },
  { dataSources: { atomService } }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('"enabled" is required')
  }

  const table = 'user_badge'
  const userIds = ids.map((id) => fromGlobalId(id).id)

  await (enabled
    ? Promise.all(
        userIds.map((id) =>
          atomService.create({ table, data: { userId: id, type } })
        )
      )
    : atomService.deleteMany({
        table,
        where: { type },
        whereIn: ['user_id', userIds],
      }))

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver

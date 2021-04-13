import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleUsersBadgeResolver } from 'definitions'

const resolver: MutationToToggleUsersBadgeResolver = async (
  root,
  { input: { ids, type, enabled } },
  { dataSources: { atomService }, viewer }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('"enabled" is required')
  }

  const table = 'user_badge'
  const userIds = ids.map((id) => fromGlobalId(id).id)

  if (enabled) {
    await Promise.all(
      userIds.map((id) =>
        atomService.create({ table, data: { userId: id, type } })
      )
    )
  } else {
    await atomService.deleteMany({
      table,
      where: { type },
      whereIn: ['user_id', userIds],
    })
  }

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver

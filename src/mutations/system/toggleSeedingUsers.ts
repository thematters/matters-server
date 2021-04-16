import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleSeedingUsersResolver } from 'definitions'

const resolver: MutationToToggleSeedingUsersResolver = async (
  root,
  { input: { ids, enabled } },
  { dataSources: { atomService }, viewer }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }
  if (typeof enabled !== 'boolean') {
    throw new UserInputError('"enabled" is required')
  }

  const table = 'seeding_user'
  const userIds = ids.map((id) => fromGlobalId(id).id)

  if (enabled) {
    await Promise.all(
      userIds.map((id) => atomService.create({ table, data: { userId: id } }))
    )
  } else {
    await atomService.deleteMany({ table, whereIn: ['user_id', userIds] })
  }

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver

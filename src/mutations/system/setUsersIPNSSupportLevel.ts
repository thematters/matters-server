import createDebug from 'debug'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToSetUsersIPNSSupportLevelResolver } from 'definitions'

const debugLog = createDebug('users-ipns')

const resolver: MutationToSetUsersIPNSSupportLevelResolver = async (
  root,
  { input: { ids, supportLevel } },
  { dataSources: { atomService }, viewer }
) => {
  if (!ids || ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }

  const userIds = ids.map((id) => fromGlobalId(id).id)

  const updated = await atomService.updateMany({
    table: 'user_ipns_keys',
    whereIn: ['user_id', userIds],
    data: { supportLevel },
  })
  debugLog(
    `setUsersIPNSSupportLevel.ts updated for ${userIds.length} users, set supportLevel to ${supportLevel}`,
    updated
  )

  return atomService.findMany({ table: 'user', whereIn: ['id', userIds] })
}

export default resolver

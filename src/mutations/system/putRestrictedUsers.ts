import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putRestrictedUsers'] = async (
  _,
  { input: { ids, restrictions } },
  { dataSources: { userService } }
) => {
  if (ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }

  const userIds = ids.map((id) => fromGlobalId(id).id)

  for (const userId of userIds) {
    await userService.updateRestrictions(userId, restrictions)
  }

  return userService.baseFindByIds(userIds)
}

export default resolver

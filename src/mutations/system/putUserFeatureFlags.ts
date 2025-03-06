import type { GQLMutationResolvers } from 'definitions/index.js'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums/index.js'
import { UserInputError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['putUserFeatureFlags'] = async (
  _,
  { input: { ids, flags } },
  {
    dataSources: {
      userService,
      atomService,
      connections: { redis },
    },
  }
) => {
  if (ids.length === 0) {
    throw new UserInputError('"ids" is required')
  }

  const userIds = ids.map((id) => fromGlobalId(id).id)

  for (const userId of userIds) {
    await userService.updateFeatureFlags(userId, flags)
    invalidateFQC({ node: { id: userId, type: NODE_TYPES.User }, redis })
  }

  return atomService.userIdLoader.loadMany(userIds)
}

export default resolver

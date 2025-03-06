import type { GQLMutationResolvers } from 'definitions/index.js'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums/index.js'
import { AuthenticationError, UserInputError } from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'

const resolver: GQLMutationResolvers['deleteMoment'] = async (
  _,
  { input: { id: globalId } },
  {
    viewer,
    dataSources: {
      momentService,
      notificationService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Moment') {
    throw new UserInputError('invalid id')
  }

  const moment = await momentService.delete(id, viewer)
  notificationService.withdraw(`put-moment:${id}`)

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })

  return moment
}

export default resolver

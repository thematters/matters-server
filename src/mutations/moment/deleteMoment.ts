import type { GQLMutationResolvers } from 'definitions'

import { invalidateFQC } from '@matters/apollo-response-cache'

import { NODE_TYPES } from 'common/enums'
import { AuthenticationError, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['deleteJournal'] = async (
  _,
  { input: { id: globalId } },
  {
    viewer,
    dataSources: {
      journalService,
      connections: { redis },
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id, type } = fromGlobalId(globalId)

  if (type !== 'Journal') {
    throw new UserInputError('invalid id')
  }

  await journalService.delete(id, viewer)

  invalidateFQC({
    node: { id: viewer.id, type: NODE_TYPES.User },
    redis: redis,
  })

  return true
}

export default resolver

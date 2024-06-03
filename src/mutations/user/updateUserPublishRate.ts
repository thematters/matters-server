import type { GQLMutationResolvers } from 'definitions'

import _isEmpty from 'lodash/isEmpty'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateUserPublishRate'] = async (
  _,
  { input: { id, limit, period } },
  { dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  // validate data ranges?
  const publishRate = {
    limit,
    period,
  }

  if (_isEmpty(publishRate)) {
    throw new UserInputError('bad request')
  }

  const user = await atomService.update({
    table: 'user',
    where: { id: dbId },
    data: { publishRate },
  })

  return user
}

export default resolver

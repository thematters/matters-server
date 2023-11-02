import type { GQLMutationResolvers } from 'definitions'

import _isEmpty from 'lodash/isEmpty'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateUserExtra'] = async (
  _,
  { input: { id, referralCode } },
  { dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const jsonData = {
    ...(referralCode ? { referralCode } : null),
    // more features can be saved into extra jsonb column in future
  }

  if (_isEmpty(jsonData)) {
    throw new UserInputError('bad request')
  }

  const user = await atomService.updateJsonColumn({
    table: 'user',
    where: { id: dbId },
    jsonData,
  })

  return user
}

export default resolver

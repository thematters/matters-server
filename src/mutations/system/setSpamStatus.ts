import type { GQLMutationResolvers } from 'definitions'

import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['setSpamStatus'] = async (
  _,
  { input: { id: globalId, isSpam } },
  { dataSources: { atomService } }
) => {
  const id = fromGlobalId(globalId).id

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  return atomService.update({
    table: 'article',
    where: { id },
    data: { isSpam },
  })
}

export default resolver

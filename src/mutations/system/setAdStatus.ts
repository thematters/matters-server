import type { GQLMutationResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['setAdStatus'] = async (
  _,
  { input: { id: globalId, isAd } },
  { dataSources: { atomService } }
) => {
  const id = fromGlobalId(globalId).id

  if (!id) {
    throw new UserInputError('id is invalid')
  }

  return atomService.update({
    table: 'article',
    where: { id },
    data: { isAd },
  })
}

export default resolver

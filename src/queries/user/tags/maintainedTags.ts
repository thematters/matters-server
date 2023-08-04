import type { GQLUserResolvers } from 'definitions'

import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'

const resolver: GQLUserResolvers['tags'] = async (
  { id },
  { input },
  { dataSources: { tagService } }
) => {
  if (id === null) {
    return connectionFromArray([], input)
  }
  return connectionFromPromisedArray(tagService.findByMaintainer(id), input)
}

export default resolver

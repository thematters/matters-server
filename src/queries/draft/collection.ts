import type { GQLDraftResolvers } from 'definitions'

import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'

const resolver: GQLDraftResolvers['collection'] = (
  { collection: connections },
  { input },
  { dataSources: { atomService } }
) => {
  if (!connections || connections.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(connections),
    input
  )
}

export default resolver

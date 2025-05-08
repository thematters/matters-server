import type { GQLDraftResolvers } from '#definitions/index.js'

import {
  connectionFromArray,
  connectionFromPromisedArray,
} from '#common/utils/index.js'

const resolver: GQLDraftResolvers['connections'] = (
  { connections },
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

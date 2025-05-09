import type { GQLDraftResolvers } from '#definitions/index.js'

import {
  connectionFromArray,
  connectionFromPromisedArray,
} from '#common/utils/index.js'

const resolver: GQLDraftResolvers['collections'] = async (
  { collections },
  { input },
  { dataSources: { atomService } }
) => {
  if (!collections || collections.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    atomService.collectionIdLoader.loadMany(collections),
    input
  )
}

export default resolver

import type { GQLDraftResolvers } from '#definitions/index.js'

import { connectionFromArray } from '#common/utils/index.js'
import compact from 'lodash/compact.js'

const resolver: GQLDraftResolvers['collections'] = async (
  { collections },
  { input },
  { dataSources: { atomService } }
) => {
  if (!collections || collections.length === 0) {
    return connectionFromArray([], input)
  }

  const records = await atomService.collectionIdLoader.loadMany(collections)

  return connectionFromArray(compact(records), input)
}

export default resolver

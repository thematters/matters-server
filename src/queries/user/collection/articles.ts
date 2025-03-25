import type { GQLCollectionResolvers } from '#definitions/index.js'

import {
  connectionFromArray,
  connectionFromQuery,
} from '#common/utils/index.js'

const resolver: GQLCollectionResolvers['articles'] = async (
  { id: collectionId },
  { input },
  { dataSources: { collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], input)
  }

  const orderBy = {
    column: 'order',
    order: input.reversed ? ('desc' as const) : ('asc' as const),
  }

  return connectionFromQuery({
    query: collectionService.findArticles(collectionId),
    args: input,
    orderBy,
    cursorColumn: 'id',
  })
}

export default resolver

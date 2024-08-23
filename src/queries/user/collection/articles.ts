import type { GQLCollectionResolvers } from 'definitions'

import { connectionFromArray, connectionFromQuery } from 'common/utils'

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
    idCursorColumn: 'id',
  })
}

export default resolver

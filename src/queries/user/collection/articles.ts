import type { GQLCollectionResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLCollectionResolvers['articles'] = async (
  { id: collectionId },
  { input: { first, after, reversed } },
  { dataSources: { atomService, collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], { first, after })
  }

  const { skip, take } = fromConnectionArgs({ first, after })

  if (take === 0) {
    const [_, count] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip,
        take: 1,
        reversed,
      }
    )
    return connectionFromArray([], { first, after }, count)
  }

  const [articles, totalCount] =
    await collectionService.findAndCountArticlesInCollection(collectionId, {
      skip,
      take,
      reversed,
    })

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(
      articles.map(({ articleId }) => articleId)
    ),
    { first, after },
    totalCount
  )
}

export default resolver

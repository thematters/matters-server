import type { GQLCollectionResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLCollectionResolvers['articles'] = async (
  { id: collectionId },
  { input: { before, first, after, reversed, articleId } },
  { dataSources: { atomService, collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], { first, after })
  }

  const { skip, take } = fromConnectionArgs({ before, first, after })

  if (take === 0) {
    // we are only looking for the count here
    const [, count] = await collectionService.findAndCountArticlesInCollection(
      collectionId,
      {
        skip,
        take: 1,
        reversed,
      }
    )
    return connectionFromArray([], { first, after }, count)
  }

  const [articles, totalCount] = articleId
    ? // if articleId is provided, we need to use that as the cursor
    await collectionService.findArticleInCollection(collectionId, articleId, {
      take,
      reversed,
    })
    : await collectionService.findAndCountArticlesInCollection(collectionId, {
      skip,
      take,
      reversed,
    })

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(
      articles.map(article => article.articleId)
    ),
    { before, first, after },
    totalCount
  )
}

export default resolver

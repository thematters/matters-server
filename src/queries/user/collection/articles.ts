import type { GQLCollectionResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
  fromGlobalId,
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

  const parsedArticleId = articleId ? fromGlobalId(articleId).id : undefined // need to parse input ID from global ID

  const [articles, totalCount] = parsedArticleId
    ? // if articleId is provided, we need to use that as the cursor
    await collectionService.findArticlesInCollectionByArticle(
      collectionId,
      parsedArticleId,
      {
        take,
        reversed,
      }
    )
    : await collectionService.findAndCountArticlesInCollection(collectionId, {
      skip,
      take,
      reversed,
    })

  return connectionFromPromisedArray(
    atomService.articleIdLoader.loadMany(
      articles.map((article) => article.articleId)
    ),
    { before, first, after },
    totalCount
  )
}

export default resolver

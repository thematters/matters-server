import type { CollectionArticle, GQLCollectionResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromPromisedArray,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLCollectionResolvers['articles'] = async (
  { id: collectionId },
  { input: { first, after, reversed, articleId } },
  { dataSources: { atomService, collectionService } }
) => {
  if (!collectionId) {
    return connectionFromArray([], { first, after })
  }

  const { skip, take } = fromConnectionArgs({ first, after })

  if (take === 0) {
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

  const loadArticles = async (
    articles: CollectionArticle[],
    totalCount: number,
    pageNumber: number | null = 1
  ) => {
    const connection = await connectionFromPromisedArray(
      atomService.articleIdLoader.loadMany(
        articles.map(({ articleId: aid }) => aid)
      ),
      { first, after },
      totalCount
    )

    return pageNumber ? { ...connection, pageNumber } : connection
  }

  if (articleId) {
    const [articles, totalCount, pageNumber] =
      await collectionService.findArticleInCollection(collectionId, articleId, {
        take,
        reversed,
      })

    return loadArticles(articles, totalCount, pageNumber)
  } else {
    const [articles, totalCount] =
      await collectionService.findAndCountArticlesInCollection(collectionId, {
        skip,
        take,
        reversed,
      })

    return loadArticles(articles, totalCount)
  }
}

export default resolver

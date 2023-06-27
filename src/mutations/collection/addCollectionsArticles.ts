import {
  ForbiddenError,
  UserInputError,
  EntityNotFoundError,
  ArticleNotFoundError,
  ActionLimitExceededError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToAddCollectionsArticlesResolver } from 'definitions'

const resolver: MutationToAddCollectionsArticlesResolver = async (
  _,
  { input: { collections: rawCollections, articles: rawArticles } },
  { dataSources: { collectionService, articleService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }
  if (rawCollections.length + rawArticles.length > 101) {
    throw new ActionLimitExceededError('Exceed action limit')
  }

  const collections = [...new Set(rawCollections)]
  const articles = [...new Set(rawArticles)]

  const collectionTypes = collections.map((id) => fromGlobalId(id).type)
  if (collectionTypes.some((type) => type !== 'Collection')) {
    throw new UserInputError('Invalid Collection ids')
  }
  const articleTypes = articles.map((id) => fromGlobalId(id).type)
  if (articleTypes.some((type) => type !== 'Article')) {
    throw new UserInputError('Invalid Article ids')
  }

  const collectionIds = collections.map((id) => fromGlobalId(id).id)
  for (const collectionId of collectionIds) {
    const collection = await collectionService.baseFindById(collectionId)
    if (!collection) {
      throw new EntityNotFoundError('Collection not found')
    }
    if (collection.authorId !== viewer.id) {
      throw new ForbiddenError('Viewer has no permission')
    }
  }

  // TODO check article if already in collection

  const articleIds = articles.map((id) => fromGlobalId(id).id)
  for (const articleId of articleIds) {
    const article = await articleService.baseFindById(articleId)
    if (!article) {
      throw new ArticleNotFoundError('Article not found')
    }
    if (article.authorId !== viewer.id) {
      throw new ForbiddenError('Viewer has no permission')
    }
  }

  if (collections.length === 0) {
    return []
  }

  // add articles to collection
  for (const collectionId of collectionIds) {
    if (articles.length > 0) {
      await collectionService.addArticles(collectionId, articleIds)
    }
  }

  return await collectionService.findByIds(collectionIds)
}

export default resolver

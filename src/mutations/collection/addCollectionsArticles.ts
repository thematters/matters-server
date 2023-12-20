import type { GQLMutationResolvers } from 'definitions'

import {
  ARTICLE_STATE,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  NODE_TYPES,
  MAX_ARTICLES_PER_COLLECTION_LIMIT,
} from 'common/enums'
import {
  ForbiddenError,
  UserInputError,
  EntityNotFoundError,
  ArticleNotFoundError,
  ActionLimitExceededError,
} from 'common/errors'
import { auditLog } from 'common/logger'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['addCollectionsArticles'] = async (
  _,
  { input: { collections: rawCollections, articles: rawArticles } },
  { dataSources: { collectionService, articleService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }
  if (
    rawCollections.length * rawArticles.length >
    MAX_ARTICLES_PER_COLLECTION_LIMIT
  ) {
    throw new ActionLimitExceededError('Action limit exceeded')
  }

  const collections = [...new Set(rawCollections)]
  const articles = [...new Set(rawArticles)]

  const collectionTypes = collections.map((id) => fromGlobalId(id).type)
  if (collectionTypes.some((type) => type !== NODE_TYPES.Collection)) {
    throw new UserInputError('Invalid Collection ids')
  }
  const articleTypes = articles.map((id) => fromGlobalId(id).type)
  if (articleTypes.some((type) => type !== NODE_TYPES.Article)) {
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

  const articleIds = articles.map((id) => fromGlobalId(id).id)

  for (const articleId of articleIds) {
    const article = await articleService.baseFindById(articleId)
    if (!article || article.state !== ARTICLE_STATE.active) {
      throw new ArticleNotFoundError('Article not found')
    }
    if (article.authorId !== viewer.id) {
      throw new ForbiddenError('Viewer has no permission')
    }
  }

  if (collections.length === 0) {
    return []
  }

  // check if collection has reached max articles limit and if there are duplicated articles
  for (const collectionId of collectionIds) {
    if (articles.length > 0) {
      const [originalArticles, count] =
        await collectionService.findAndCountArticlesInCollection(collectionId, {
          take: MAX_ARTICLES_PER_COLLECTION_LIMIT,
        })
      if (count + articles.length > MAX_ARTICLES_PER_COLLECTION_LIMIT) {
        throw new ActionLimitExceededError('Action limit exceeded')
      }
      if (originalArticles.length > 0) {
        const originalArticleIds = originalArticles.map((a) => a.articleId)
        const duplicatedArticleIds = originalArticleIds.filter((id) =>
          articleIds.includes(id)
        )
        if (duplicatedArticleIds.length > 0) {
          throw new UserInputError('Duplicated Article ids')
        }
      }
    }
  }

  // add articles to collection
  for (const collectionId of collectionIds) {
    if (articles.length > 0) {
      await collectionService.addArticles(collectionId, articleIds)

      articleIds.map((articleId) =>
        auditLog({
          actorId: viewer.id,
          action: AUDIT_LOG_ACTION.addArticleIntoCollection,
          entity: 'collection',
          entityId: collectionId,
          newValue: articleId,
          status: AUDIT_LOG_STATUS.succeeded,
        })
      )
    }
  }

  return await collectionService.loadByIds(collectionIds)
}

export default resolver

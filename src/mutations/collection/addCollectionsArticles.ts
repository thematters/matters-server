import type { GQLMutationResolvers } from '#definitions/index.js'

import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  NODE_TYPES,
  MAX_ARTICLES_PER_COLLECTION_LIMIT,
} from '#common/enums/index.js'
import {
  ForbiddenError,
  UserInputError,
  ActionLimitExceededError,
} from '#common/errors.js'
import { auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['addCollectionsArticles'] = async (
  _,
  { input: { collections: rawCollections, articles: rawArticles } },
  { dataSources: { collectionService, atomService }, viewer }
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

  const articleIds = articles.map((id) => fromGlobalId(id).id)

  if (collections.length === 0) {
    return []
  }

  // add articles to collection
  for (const collectionId of collectionIds) {
    if (articles.length > 0) {
      await collectionService.addArticles({
        collectionId,
        articleIds,
        user: viewer,
      })

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

  return await atomService.collectionIdLoader.loadMany(collectionIds)
}

export default resolver

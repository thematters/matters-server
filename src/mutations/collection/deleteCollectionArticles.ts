import type { GQLMutationResolvers } from 'definitions'

import {
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  NODE_TYPES,
  GRAPHQL_INPUT_LENGTH_LIMIT,
} from 'common/enums'
import {
  ForbiddenError,
  UserInputError,
  ActionLimitExceededError,
} from 'common/errors'
import { auditLog } from 'common/logger'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['deleteCollectionArticles'] = async (
  _,
  { input: { collection: globalId, articles } },
  { dataSources: { collectionService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (articles.length > GRAPHQL_INPUT_LENGTH_LIMIT) {
    throw new ActionLimitExceededError('Action limit exceeded')
  }
  const { id: collectionId, type: collectionType } = fromGlobalId(globalId)
  if (collectionType !== NODE_TYPES.Collection) {
    throw new UserInputError('Invalid Collection id')
  }
  const articleTypes = articles.map((id) => fromGlobalId(id).type)
  if (articleTypes.some((type) => type !== NODE_TYPES.Article)) {
    throw new UserInputError('Invalid Article ids')
  }

  const collection = await collectionService.loadById(collectionId)

  if (!collection) {
    throw new UserInputError('Collection not found')
  }
  if (collection.authorId !== viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (articles.length === 0) {
    return collection
  }

  await collectionService.deleteCollectionArticles(
    collectionId,
    articles.map((id) => fromGlobalId(id).id)
  )

  articles.map((id) =>
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.removeArticleFromCollection,
      entity: 'collection',
      entityId: collectionId,
      oldValue: fromGlobalId(id).id,
      status: AUDIT_LOG_STATUS.succeeded,
    })
  )

  return collection
}

export default resolver

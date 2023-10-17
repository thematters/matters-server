import type { GQLMutationResolvers } from 'definitions'

import { NODE_TYPES, GRAPHQL_INPUT_LENGTH_LIMIT } from 'common/enums'
import {
  ForbiddenError,
  UserInputError,
  ActionLimitExceededError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['reorderCollectionArticles'] = async (
  _,
  { input: { collection: globalId, moves: rawMoves } },
  { dataSources: { collectionService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (rawMoves.length > GRAPHQL_INPUT_LENGTH_LIMIT) {
    throw new ActionLimitExceededError('Action limit exceeded')
  }

  const { id: collectionId, type: collectionType } = fromGlobalId(globalId)
  if (collectionType !== NODE_TYPES.Collection) {
    throw new UserInputError('Invalid Collection id')
  }

  const collection = await collectionService.loadById(collectionId)

  if (!collection) {
    throw new UserInputError('Collection not found')
  }
  if (collection.authorId !== viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  const moves = rawMoves.map(({ item: articleGlobalId, newPosition }) => {
    const { id: articleId, type: articleType } = fromGlobalId(articleGlobalId)
    if (articleType !== NODE_TYPES.Article) {
      throw new UserInputError('Invalid Article id')
    }
    return { articleId, newPosition }
  })

  await collectionService.reorderArticles(collectionId, moves)

  return collection
}

export default resolver

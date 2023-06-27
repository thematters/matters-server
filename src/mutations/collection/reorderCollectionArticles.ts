import {
  ForbiddenError,
  UserInputError,
  ActionLimitExceededError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToReorderCollectionArticlesResolver } from 'definitions'

const resolver: MutationToReorderCollectionArticlesResolver = async (
  _,
  { input: { collection: globalId, moves: rawMoves } },
  { dataSources: { collectionService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (rawMoves.length > 50) {
    throw new ActionLimitExceededError('Action limit exceeded')
  }

  const { id: collectionId, type: collectionType } = fromGlobalId(globalId)
  if (collectionType !== 'Collection') {
    throw new UserInputError('Invalid Collection id')
  }

  const collection = await collectionService.findById(collectionId)

  if (!collection) {
    throw new UserInputError('Collection not found')
  }
  if (collection.authorId !== viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  const moves = rawMoves.map(({ item: articleGlobalId, newPosition }) => {
    const { id: articleId, type: articleType } = fromGlobalId(articleGlobalId)
    if (articleType !== 'Article') {
      throw new UserInputError('Invalid Article id')
    }
    return { articleId, newPosition }
  })

  try {
    await collectionService.reorderArticles(collectionId, moves)
  } catch (e: any) {
    if (e.message === 'Invalid newPosition') {
      throw new UserInputError('Invalid newPosition')
    }
    if (e.message === 'Invalid Article id') {
      throw new UserInputError('Invalid Article id')
    }
    throw e
  }

  return collection
}

export default resolver

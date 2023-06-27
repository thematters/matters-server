import {
  ForbiddenError,
  UserInputError,
  ActionLimitExceededError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteCollectionArticlesResolver } from 'definitions'

const resolver: MutationToDeleteCollectionArticlesResolver = async (
  _,
  { input: { collection, articles } },
  { dataSources: { collectionService }, viewer }
) => {
  if (!viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (articles.length > 100) {
    throw new ActionLimitExceededError('Action limit exceeded')
  }
  const { id: collectionId, type: collectionType } = fromGlobalId(collection)
  if (collectionType !== 'Collection') {
    throw new UserInputError('Invalid Collection id')
  }
  const articleTypes = articles.map((id) => fromGlobalId(id).type)
  if (articleTypes.some((type) => type !== 'Article')) {
    throw new UserInputError('Invalid Article ids')
  }

  const collectionInDB = await collectionService.findById(collectionId)

  if (!collectionInDB) {
    throw new UserInputError('Collection not found')
  }
  if (collectionInDB.authorId !== viewer.id) {
    throw new ForbiddenError('Viewer has no permission')
  }

  if (articles.length === 0) {
    return collectionInDB
  }

  await collectionService.deleteCollectionArticles(
    collectionId,
    articles.map((id) => fromGlobalId(id).id)
  )
  return collectionInDB
}

export default resolver

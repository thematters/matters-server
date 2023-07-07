import type { CollectionToContainsResolver } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: CollectionToContainsResolver = async (
  { id: collectionId },
  { input: { id: articleGlobalId } },
  { dataSources: { collectionService } }
) => {
  const { id: articleId, type } = fromGlobalId(articleGlobalId)
  if (type !== NODE_TYPES.Article) {
    throw new UserInputError('Invalid Article ids')
  }
  return await collectionService.containsArticle(collectionId, articleId)
}

export default resolver

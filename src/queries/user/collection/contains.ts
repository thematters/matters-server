import type { GQLCollectionResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { UserInputError } from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLCollectionResolvers['contains'] = async (
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

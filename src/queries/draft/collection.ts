import type { GQLDraftResolvers } from 'definitions'

import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'

const resolver: GQLDraftResolvers['collection'] = (
  { collection },
  { input },
  { dataSources: { articleService } }
) => {
  if (!collection || collection.length === 0) {
    return connectionFromArray([], input)
  }

  return connectionFromPromisedArray(
    articleService.loadDraftsByArticles(collection),
    input
  )
}

export default resolver

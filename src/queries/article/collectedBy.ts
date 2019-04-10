import { connectionFromPromisedArray } from 'common/utils'

import { ArticleToCollectedByResolver } from 'definitions'

const resolver: ArticleToCollectedByResolver = (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  return []
  // return connectionFromPromisedArray(articleService.findByUpstream(id), input)
}

export default resolver

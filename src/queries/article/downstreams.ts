import { connectionFromPromisedArray } from 'common/utils'

import { ArticleToDownstreamsResolver } from 'definitions'

const resolver: ArticleToDownstreamsResolver = (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  return connectionFromPromisedArray(articleService.findByUpstream(id), input)
}

export default resolver

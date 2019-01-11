import { connectionFromPromisedArray } from 'graphql-relay'

import { ArticleToDownstreamsResolver } from 'definitions'

const resolver: ArticleToDownstreamsResolver = (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  return connectionFromPromisedArray(articleService.findByUpstream(id), input)
}

export default resolver

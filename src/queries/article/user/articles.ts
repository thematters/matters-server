import { connectionFromPromisedArray } from 'graphql-relay'

import { UserToArticlesResolver } from 'definitions'

const resolver: UserToArticlesResolver = (
  { id },
  { input },
  { dataSources: { articleService } }
) => {
  return connectionFromPromisedArray(articleService.findByAuthor(id), input)
}

export default resolver

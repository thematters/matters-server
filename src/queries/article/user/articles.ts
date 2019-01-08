import { Context, UserToArticlesResolver } from 'definitions'
import { connectionFromPromisedArray } from 'graphql-relay'

const resolver: UserToArticlesResolver = (
  { id }: { id: string },
  { input },
  { dataSources: { articleService } }: Context
) => {
  return connectionFromPromisedArray(articleService.findByAuthor(id), input)
}

export default resolver

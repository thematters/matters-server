import { connectionFromPromisedArray } from 'graphql-relay'

import { QueryToSearchResolver } from 'definitions'

const resolver: QueryToSearchResolver = (
  root,
  { input },
  { dataSources: { articleService, userService, tagService } }
) => {
  const serviceMap = {
    Article: articleService,
    User: userService,
    Tag: tagService
  }
  return connectionFromPromisedArray(
    serviceMap[input.type].search(input),
    input
  )
}

export default resolver

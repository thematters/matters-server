import { connectionFromPromisedArray } from 'graphql-relay'

import { QueryToSearchResolver, GQLNode } from 'definitions'

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
    serviceMap[input.type]
      .search(input)
      .then(nodes =>
        nodes.map((node: GQLNode) => ({ ...node, __type: input.type }))
      ),
    input
  )
}

export default resolver

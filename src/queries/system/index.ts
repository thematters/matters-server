import { NodeTypes, Context, GQLSearchInput } from 'definitions'

import node from './node'

export default {
  Query: {
    node,
    search: async (
      root: any,
      { input }: { input: GQLSearchInput },
      {
        systemService,
        articleService,
        userService,
        commentService,
        draftService,
        tagService
      }: Context
    ) => {
      // TODO: better of mapping index to type name
      // TODO: get match text from ES
      // TODO: use dataService as a map
      const serviceMap = {
        Article: articleService
        // User: userService,
        // Comment: commentService,
        // Draft: draftService,
        // Tag: tagService
      }

      if (input && input.type) {
        const result = serviceMap[input.type].search(input)
        return result
      }
    }
  },
  Node: {
    __resolveType: ({ __type }: { __type: NodeTypes }) => __type
  }
}

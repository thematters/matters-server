import { NodeTypes, Context, GQLSearchInput } from 'definitions'

import node from './node'

export default {
  Query: {
    node,
    search: async (
      root: any,
      { input }: { input: GQLSearchInput },
      {
        dataSources: {
          systemService,
          articleService,
          userService,
          commentService,
          draftService,
          tagService
        }
      }: Context
    ) => {
      // TODO: better of mapping index to type name
      // TODO: get match text from ES
      // TODO: use dataService as a map
      const serviceMap = {
        Article: articleService,
        User: userService,
        Comment: commentService,
        Draft: draftService,
        Tag: tagService
      }

      const indexToNode = (index: string) =>
        index.charAt(0).toUpperCase() + index.substr(1)

      const hits = await systemService.search(input)
      let result: { node: any; match: string }[]
      if (hits) {
        try {
          result = await Promise.all(
            hits.map(async ({ _id, _index }) => {
              const type = indexToNode(_index) as NodeTypes
              const node = await serviceMap[type].dataloader.load(_id)
              return {
                node: {
                  ...node,
                  __type: type
                },
                match: input.key
              }
            })
          )
        } catch (err) {
          throw err
        }
      } else {
        result = []
      }

      return result
    }
  },
  Node: {
    __resolveType: ({ __type }: { __type: NodeTypes }) => __type
  },
  Asset: {
    id: ({ uuid }: { uuid: string }) => uuid
  }
}

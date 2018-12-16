import { Context, NodeTypes } from 'definitions'
import { fromGlobalId } from 'common/utils'

export default {
  Query: {
    node: async (
      root: any,
      { input: { id } }: { input: { id: string } },
      { articleService, userService, commentService }: Context
    ) => {
      const serviceMap = {
        Article: articleService,
        User: userService,
        Comment: commentService
      }

      const { type, id: dbId } = fromGlobalId(id) as {
        type: NodeTypes
        id: string
      }
      const node = await serviceMap[type].idLoader.load(dbId)

      return { ...node, __type: type }
    }
  },
  Entity: {
    __resolveType: () => 'Article'
  },
  Node: {
    __resolveType: ({ __type }: { __type: NodeTypes }, _: any) => __type
  }
}

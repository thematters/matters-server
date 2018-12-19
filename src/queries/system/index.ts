import { Context, NodeTypes } from 'definitions'
import { fromGlobalId } from 'common/utils'

export default {
  Query: {
    node: async (
      root: any,
      { input: { id } }: { input: { id: string } },
      {
        articleService,
        assetService,
        userService,
        commentService,
        draftService,
        tagService
      }: Context
    ) => {
      const serviceMap = {
        Article: articleService,
        Asset: assetService,
        User: userService,
        Comment: commentService,
        Draft: draftService,
        Tag: tagService
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

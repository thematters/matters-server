import type { GQLTagResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { connectionFromUnionQuery } from '#common/utils/index.js'

const resolver: GQLTagResolvers['writings'] = async (
  { id },
  { input },
  { dataSources: { userWorkService, atomService } }
) => {
  const result = await connectionFromUnionQuery({
    query: userWorkService.findWritingsByTag(id, { flood: false }),
    args: input,
    orderBy: { column: 'created_at', order: 'desc' },
    cursorColumn: 'id',
    dataloaders: {
      [NODE_TYPES.Moment]: atomService.momentIdLoader,
      [NODE_TYPES.Article]: atomService.articleIdLoader,
    },
  })

  return {
    ...result,
    edges:
      result.edges?.map((edge) => ({
        ...edge,
        pinned: edge.node.tagPinned,
      })) || [],
  }
}

export default resolver

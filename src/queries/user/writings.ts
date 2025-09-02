import type { GQLUserResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { connectionFromUnionQuery } from '#common/utils/index.js'

const resolver: GQLUserResolvers['writings'] = async (
  { id },
  { input },
  { dataSources: { userWorkService, atomService } }
) => {
  return connectionFromUnionQuery({
    query: userWorkService.findWritingsByUser(id),
    args: input,
    orderBy: { column: 'created_at', order: 'desc' },
    cursorColumn: 'id',
    dataloaders: {
      [NODE_TYPES.Moment]: atomService.momentIdLoader,
      [NODE_TYPES.Article]: atomService.articleIdLoader,
    },
  })
}

export default resolver

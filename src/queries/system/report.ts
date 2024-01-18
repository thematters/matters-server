import type { GQLReportResolvers, Draft } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'
import { toGlobalId } from 'common/utils'

const report: GQLReportResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.Report, id }),
  reporter: ({ reporterId }, _, { dataSources: { userService } }) =>
    userService.loadById(reporterId),
  target: async (
    { articleId, commentId },
    _,
    { dataSources: { articleService, commentService } }
  ) => {
    if (articleId) {
      return {
        ...((await articleService.dataloader.load(articleId)) as Draft),
        __type: NODE_TYPES.Article,
      }
    } else if (commentId) {
      return {
        ...(await commentService.loadById(commentId)),
        __type: NODE_TYPES.Comment,
      }
    } else {
      throw new ServerError('target not found')
    }
  },
}

export default report

import type { GQLReportResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'
import { ServerError } from 'common/errors'
import { toGlobalId } from 'common/utils'

const report: GQLReportResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.Report, id }),
  reporter: ({ reporterId }, _, { dataSources: { atomService } }) =>
    atomService.userIdLoader.load(reporterId),
  target: async (
    { articleId, commentId },
    _,
    { dataSources: { atomService } }
  ) => {
    if (articleId) {
      return {
        ...(await atomService.articleIdLoader.load(articleId)),
        __type: NODE_TYPES.Article,
      }
    } else if (commentId) {
      return {
        ...(await atomService.commentIdLoader.load(commentId)),
        __type: NODE_TYPES.Comment,
      }
    } else {
      throw new ServerError('target not found')
    }
  },
}

export default report

import type { GQLReportResolvers } from 'definitions/index.js'

import { NODE_TYPES } from 'common/enums/index.js'
import { ServerError } from 'common/errors.js'
import { toGlobalId } from 'common/utils/index.js'

const report: GQLReportResolvers = {
  id: ({ id }) => toGlobalId({ type: NODE_TYPES.Report, id }),
  reporter: ({ reporterId }, _, { dataSources: { atomService } }) =>
    atomService.userIdLoader.load(reporterId),
  target: async (
    { articleId, commentId, momentId },
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
    } else if (momentId) {
      return {
        ...(await atomService.momentIdLoader.load(momentId)),
        __type: NODE_TYPES.Moment,
      }
    } else {
      throw new ServerError('target not found')
    }
  },
}

export default report

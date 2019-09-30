import _ from 'lodash'

import { REPORT_CATEGORIES } from 'common/enums'
import { GQLReportTypeResolver } from 'definitions'

const resolvers: GQLReportTypeResolver = {
  user: ({ userId }, args, { dataSources: { userService } }) =>
    userId && userService.dataloader.load(userId),
  article: ({ articleId }, args, { dataSources: { articleService } }) =>
    articleId && articleService.dataloader.load(articleId),
  comment: ({ commentId }, args, { dataSources: { commentService } }) =>
    commentId && commentService.dataloader.load(commentId),
  assets: ({ id }, args, { dataSources: { systemService } }) =>
    systemService.findAssetsByReportId(id),
  category: ({ category }, args, { viewer }) => {
    const matched = _.find(REPORT_CATEGORIES[viewer.language], { id: category })
    return _.get(matched, 'name', 'UNKNOWN')
  }
}

export default resolvers

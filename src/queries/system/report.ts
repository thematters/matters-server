import _ from 'lodash'

import { GQLReportTypeResolver } from 'definitions'
import { REPORT_CATEGORIES } from 'common/enums'

const resolvers: GQLReportTypeResolver = {
  user: ({ userId }, _, { dataSources: { userService } }) =>
    userId && userService.dataloader.load(userId),
  article: ({ articleId }, _, { dataSources: { articleService } }) =>
    articleId && articleService.dataloader.load(articleId),
  comment: ({ commentId }, _, { dataSources: { commentService } }) =>
    commentId && commentService.dataloader.load(commentId),
  assets: ({ id }, _, { dataSources: { systemService } }) =>
    systemService.findAssetsByReportId(id),
  category: ({ category }) => {
    const matched = _.find(REPORT_CATEGORIES, { id: category })
    return _.get(matched, 'name', 'UNKNOWN')
  }
}

export default resolvers

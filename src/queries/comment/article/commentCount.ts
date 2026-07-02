import type { GQLArticleResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['commentCount'] = (
  { id: articleId },
  _,
  { viewer, dataSources: { commentService } }
) =>
  commentService.count(articleId, COMMENT_TYPE.article, {
    includeRestrictedAuthors: viewer.hasRole('admin'),
  })

export default resolver

import type { GQLArticleResolvers } from '#definitions/index.js'

import { COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['commentCount'] = (
  { id: articleId },
  _,
  { dataSources: { commentService } }
) => commentService.count(articleId, COMMENT_TYPE.article)

export default resolver

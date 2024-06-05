import type { GQLArticleResolvers } from 'definitions'

import { COMMENT_TYPE } from 'common/enums'

const resolver: GQLArticleResolvers['commentCount'] = (
  { id: articleId },
  _,
  { dataSources: { commentService } }
) => commentService.count(articleId, COMMENT_TYPE.article)

export default resolver

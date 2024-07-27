import type { GQLArticleResolvers } from 'definitions'

import { COMMENT_TYPE } from 'common/enums'

const resolver: GQLArticleResolvers['responseCount'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService, commentService } }
) => {
  const [articleCount, commentCount] = await Promise.all([
    articleService.countActiveConnectedBy(articleId),
    commentService.count(articleId, COMMENT_TYPE.article),
  ])
  return articleCount + commentCount
}

export default resolver

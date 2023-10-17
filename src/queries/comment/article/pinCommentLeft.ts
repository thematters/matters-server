import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['pinCommentLeft'] = (
  { articleId },
  _,
  { dataSources: { commentService } }
) => commentService.pinLeftByArticle(articleId)

export default resolver

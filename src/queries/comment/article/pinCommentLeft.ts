import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['pinCommentLeft'] = (
  { id: articleId },
  _,
  { dataSources: { commentService } }
) => commentService.pinLeftByArticle(articleId)

export default resolver

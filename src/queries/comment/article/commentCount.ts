import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['commentCount'] = (
  { articleId },
  _,
  { dataSources: { commentService } }
) => commentService.countByArticle(articleId)

export default resolver

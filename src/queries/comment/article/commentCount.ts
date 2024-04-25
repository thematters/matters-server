import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['commentCount'] = (
  { id: articleId },
  _,
  { dataSources: { commentService } }
) => commentService.countByArticle(articleId)

export default resolver

import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['responseCount'] = async (
  { articleId },
  _,
  { dataSources: { articleService, commentService } }
) => {
  const [articleCount, commentCount] = await Promise.all([
    articleService.countActiveConnectedBy(articleId),
    commentService.countByArticle(articleId),
  ])
  return articleCount + commentCount
}

export default resolver

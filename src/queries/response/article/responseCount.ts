import { ArticleToResponseCountResolver } from 'definitions'

const resolver: ArticleToResponseCountResolver = async (
  { articleId },
  _,
  { dataSources: { articleService, commentService } }
) => {
  const [articleCount, commentCount] = await Promise.all([
    articleService.countActiveCollectedBy(articleId),
    commentService.countByArticle(articleId),
  ])
  return articleCount + commentCount
}

export default resolver

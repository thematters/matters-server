import { ArticleToResponseCountResolver } from 'definitions'

const resolver: ArticleToResponseCountResolver = async (
  { id },
  _,
  { dataSources: { articleService, commentService } }
) => {
  const [articleCount, commentCount] = await Promise.all([
    articleService.countActiveCollectedBy(id),
    commentService.countByArticleForResponse(id)
  ])
  return articleCount + commentCount
}

export default resolver

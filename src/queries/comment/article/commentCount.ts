import { ArticleToCommentCountResolver } from 'definitions'

const resolver: ArticleToCommentCountResolver = (
  { articleId },
  _,
  { dataSources: { commentService } }
) => commentService.countByArticle(articleId)

export default resolver

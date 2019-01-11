import { ArticleToCommentCountResolver } from 'definitions'

const resolver: ArticleToCommentCountResolver = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countByArticle(id)

export default resolver

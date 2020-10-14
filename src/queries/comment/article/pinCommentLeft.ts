import { ArticleToPinCommentLeftResolver } from 'definitions'

const resolver: ArticleToPinCommentLeftResolver = (
  { articleId },
  _,
  { dataSources: { commentService } }
) => commentService.pinLeftByArticle(articleId)

export default resolver

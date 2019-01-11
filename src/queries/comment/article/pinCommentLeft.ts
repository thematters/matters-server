import { ArticleToPinCommentLeftResolver } from 'definitions'

const resolver: ArticleToPinCommentLeftResolver = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.pinLeftByArticle(id)

export default resolver

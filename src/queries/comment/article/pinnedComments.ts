import { ArticleToPinnedCommentsResolver } from 'definitions'

const resolver: ArticleToPinnedCommentsResolver = (
  { articleId },
  _,
  { dataSources: { commentService } }
) => commentService.findPinnedByArticle(articleId)

export default resolver

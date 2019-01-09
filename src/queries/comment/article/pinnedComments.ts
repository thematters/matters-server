import { ArticleToPinnedCommentsResolver } from 'definitions'

const resolver: ArticleToPinnedCommentsResolver = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.findPinnedByArticle(id)

export default resolver

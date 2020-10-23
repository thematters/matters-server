import { connectionFromArray } from 'common/utils'
import { ArticleToFeaturedCommentsResolver } from 'definitions'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { articleId },
  { input: { first, after } },
  { dataSources: { commentService } }
) => {
  const featureComments = await commentService.findFeaturedCommentsByArticle({
    id: articleId,
  })

  // use simple pagination for now
  return connectionFromArray(featureComments, { first, after })
}

export default resolver

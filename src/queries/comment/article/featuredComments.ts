import { connectionFromArray } from 'common/utils'
import { ArticleToFeaturedCommentsResolver } from 'definitions'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { id },
  { input: { first, after } },
  { dataSources: { commentService } }
) => {
  const featureComments = await commentService.findFeaturedCommentsByArticle({
    id
  })

  // use simple pagination for now
  return connectionFromArray(featureComments, { first, after })
}

export default resolver

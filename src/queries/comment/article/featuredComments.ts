import { connectionFromArray } from 'common/utils'
import { ArticleToFeaturedCommentsResolver, GQLCommentType } from 'definitions'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { articleId },
  { input: { first, after } },
  { dataSources: { atomService, commentService } }
) => {
  const featureComments = await atomService.findMany({
    table: 'featured_comment_materialized',
    where: {
      targetId: articleId,
      type: GQLCommentType.article,
    },
    orderBy: [
      { column: 'pinned', order: 'desc' },
      { column: 'score', order: 'desc' },
    ],
  })

  // use simple pagination for now
  return connectionFromArray(featureComments, { first, after })
}

export default resolver

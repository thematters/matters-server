import { COMMENT_TYPE } from 'common/enums'
import { connectionFromArray } from 'common/utils'
import { ArticleToFeaturedCommentsResolver } from 'definitions'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { articleId },
  { input: { first, after } },
  { dataSources: { atomService } }
) => {
  const featureComments = await atomService.findMany({
    table: 'featured_comment_materialized',
    where: {
      targetId: articleId,
      type: COMMENT_TYPE.article,
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

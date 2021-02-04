import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromArray } from 'common/utils'
import { ArticleToFeaturedCommentsResolver } from 'definitions'

const resolver: ArticleToFeaturedCommentsResolver = async (
  { articleId },
  { input: { first, after } },
  { dataSources: { atomService } }
) => {
  const featuredsComments = await atomService.findMany({
    table: 'featured_comment_materialized',
    where: {
      targetId: articleId,
      state: COMMENT_STATE.active,
      type: COMMENT_TYPE.article,
    },
    orderBy: [
      { column: 'pinned', order: 'desc' },
      { column: 'score', order: 'desc' },
    ],
  })

  // use simple pagination for now
  return connectionFromArray(featuredsComments, { first, after })
}

export default resolver

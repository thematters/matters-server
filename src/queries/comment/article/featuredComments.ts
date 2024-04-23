import type { GQLArticleResolvers, Comment } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { connectionFromArray } from 'common/utils'

const resolver: GQLArticleResolvers['featuredComments'] = async (
  { id: articleId },
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
  return connectionFromArray(featuredsComments as unknown as Comment[], {
    first,
    after,
  })
}

export default resolver

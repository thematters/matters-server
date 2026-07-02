import type { GQLArticleResolvers, Comment } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE } from '#common/enums/index.js'
import { connectionFromArray } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['featuredComments'] = async (
  { id: articleId },
  { input: { first, after } },
  { viewer, dataSources: { atomService, commentService } }
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
  const visibleComments = viewer.hasRole('admin')
    ? featuredsComments
    : (
        await Promise.all(
          featuredsComments.map(async (comment) =>
            (await commentService.isAuthorRestricted(
              comment as unknown as Comment
            ))
              ? null
              : comment
          )
        )
      ).filter(Boolean)

  // use simple pagination for now
  return connectionFromArray(visibleComments as unknown as Comment[], {
    first,
    after,
  })
}

export default resolver

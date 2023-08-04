import type { GQLArticleResolvers } from 'definitions'

import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'

const resolver: GQLArticleResolvers['pinnedComments'] = (
  { articleId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findMany({
    table: 'comment',
    where: {
      pinned: true,
      state: COMMENT_STATE.active,
      targetId: articleId,
      type: COMMENT_TYPE.article,
    },
    orderBy: [{ column: 'pinned_at', order: 'desc' }],
  })

export default resolver

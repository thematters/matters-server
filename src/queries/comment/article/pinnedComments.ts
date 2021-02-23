import { COMMENT_STATE, COMMENT_TYPE } from 'common/enums'
import { ArticleToPinnedCommentsResolver } from 'definitions'

const resolver: ArticleToPinnedCommentsResolver = (
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

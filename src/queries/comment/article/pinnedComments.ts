import { COMMENT_TYPE } from 'common/enums'
import { ArticleToPinnedCommentsResolver } from 'definitions'

const resolver: ArticleToPinnedCommentsResolver = (
  { articleId },
  _,
  { dataSources: { atomService, commentService } }
) =>
  atomService.findMany({
    table: 'comment',
    where: {
      targetId: articleId,
      pinned: true,
      type: COMMENT_TYPE.article,
    },
  })

export default resolver

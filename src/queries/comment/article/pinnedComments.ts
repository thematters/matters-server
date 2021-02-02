import { ArticleToPinnedCommentsResolver, GQLCommentType } from 'definitions'

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
      type: GQLCommentType.article,
    },
  })

export default resolver

import type { Comment, GQLArticleResolvers } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLArticleResolvers['pinnedComments'] = (
  { id: articleId },
  _,
  { viewer, dataSources: { atomService, commentService } }
) => {
  const comments = atomService.findMany({
    table: 'comment',
    where: {
      pinned: true,
      state: COMMENT_STATE.active,
      targetId: articleId,
      type: COMMENT_TYPE.article,
    },
    orderBy: [{ column: 'pinned_at', order: 'desc' }],
  })

  if (viewer.hasRole('admin')) {
    return comments
  }

  return comments.then(async (records) => {
    const visible = await Promise.all(
      records.map(async (comment) =>
        (await commentService.isAuthorRestricted(comment)) ? null : comment
      )
    )
    return visible.filter((comment): comment is Comment => Boolean(comment))
  })
}

export default resolver

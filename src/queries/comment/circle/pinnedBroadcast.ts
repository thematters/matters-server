import type { Comment, GQLCircleResolvers } from '#definitions/index.js'

import { COMMENT_STATE, COMMENT_TYPE } from '#common/enums/index.js'

const resolver: GQLCircleResolvers['pinnedBroadcast'] = async (
  { id },
  _,
  { viewer, dataSources: { atomService, commentService } }
) => {
  const comments = await atomService.findMany({
    table: 'comment',
    where: {
      pinned: true,
      state: COMMENT_STATE.active,
      targetId: id,
      type: COMMENT_TYPE.circleBroadcast,
    },
    orderBy: [{ column: 'pinned_at', order: 'desc' }],
  })

  if (viewer.hasRole('admin')) {
    return comments
  }

  const visible = await Promise.all(
    comments.map(async (comment) =>
      (await commentService.isAuthorRestricted(comment)) ? null : comment
    )
  )
  return visible.filter((comment): comment is Comment => Boolean(comment))
}

export default resolver

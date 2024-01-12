import type { GQLCommentResolvers } from 'definitions'

import { COMMENT_STATE } from 'common/enums'

const resolver: GQLCommentResolvers['upvotes'] = (
  { id, state },
  _,
  { viewer, dataSources: { commentService } }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === COMMENT_STATE.collapsed
  const isAdmin = viewer.hasRole('admin')
  if (isActive || isCollapsed || isAdmin) {
    return commentService.countUpVote(id)
  } else {
    return 0
  }
}

export default resolver

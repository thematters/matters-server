import type { GQLCommentResolvers } from 'definitions'

import { COMMENT_STATE } from 'common/enums'

const resolver: GQLCommentResolvers['createdAt'] = (
  { createdAt, state },
  _,
  { viewer }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === COMMENT_STATE.collapsed
  const isAdmin = viewer.hasRole('admin')
  if (isActive || isCollapsed || isAdmin) {
    return createdAt
  } else {
    // invalid date
    return new Date(0)
  }
}

export default resolver

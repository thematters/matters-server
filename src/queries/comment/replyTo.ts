import type { GQLCommentResolvers } from 'definitions'

import { COMMENT_STATE } from 'common/enums'

const resolver: GQLCommentResolvers['replyTo'] = (
  { replyTo, state },
  _,
  { viewer, dataSources: { commentService } }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === COMMENT_STATE.collapsed
  const isAdmin = viewer.hasRole('admin')
  if (isActive || isCollapsed || isAdmin) {
    return replyTo ? commentService.loadById(replyTo) : null
  } else {
    return null
  }
}

export default resolver

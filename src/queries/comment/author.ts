import type { GQLCommentResolvers } from 'definitions'

import { COMMENT_STATE } from 'common/enums'

const resolver: GQLCommentResolvers['author'] = (
  { authorId, state },
  _,
  { viewer, dataSources: { userService } }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === COMMENT_STATE.collapsed
  const isAdmin = viewer.hasRole('admin')
  if (isActive || isCollapsed || isAdmin) {
    return userService.loadById(authorId)
  } else {
    return null
  }
}

export default resolver

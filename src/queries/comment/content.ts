import type { GQLCommentResolvers } from 'definitions'

import { COMMENT_STATE } from 'common/enums'

const resolver: GQLCommentResolvers['content'] = (
  { content, state },
  _,
  { viewer }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === 'collapsed'
  const isAdmin = viewer.hasRole('admin')

  if (isActive || isCollapsed || isAdmin) {
    return content
  }

  return ''
}

export default resolver

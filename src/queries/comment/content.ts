import type { GQLCommentResolvers } from 'definitions/index.js'

import { COMMENT_STATE } from 'common/enums/index.js'

const resolver: GQLCommentResolvers['content'] = (
  { content, state },
  _,
  { viewer }
) => {
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === 'collapsed'
  const isAdmin = viewer.hasRole('admin')

  if (isActive || isCollapsed || isAdmin) {
    return content ?? null
  }

  return ''
}

export default resolver

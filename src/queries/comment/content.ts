import type { GQLCommentResolvers } from '#definitions/index.js'

import { COMMENT_STATE } from '#common/enums/index.js'

const resolver: GQLCommentResolvers['content'] = async (
  comment,
  _,
  { viewer, dataSources: { commentService } }
) => {
  const { content, state, authorId } = comment
  const isActive = state === COMMENT_STATE.active
  const isCollapsed = state === 'collapsed'
  const isAdmin = viewer.hasRole('admin')

  if (isAdmin) {
    return content ?? null
  }

  if (!isActive && !isCollapsed) {
    return ''
  }

  // hide content from restricted (frozen/archived) authors on every read
  // path, incl. notices that load comments outside the filtered lists
  if (
    viewer.id !== authorId &&
    (await commentService.isAuthorRestricted(comment))
  ) {
    return ''
  }

  return content ?? null
}

export default resolver

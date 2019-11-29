import { CommentToContentResolver } from 'definitions'
import { ARTICLE_STATE } from 'common/enums'

const resolver: CommentToContentResolver = (
  { content, state },
  _,
  { viewer }
) => {
  const isActive = state === ARTICLE_STATE.active
  const isCollapsed = state === 'collapsed'
  const isAdmin = viewer.hasRole('admin')

  if (isActive || isCollapsed || isAdmin) {
    return content
  }

  return ''
}

export default resolver

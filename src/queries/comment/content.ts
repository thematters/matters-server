import { CommentToContentResolver } from 'definitions'

const resolver: CommentToContentResolver = (
  { content, state },
  _,
  { viewer }
) => {
  const isActive = state === 'active'
  const isCollapsed = state === 'collapsed'
  const isAdmin = viewer && viewer.id && viewer.role === 'admin'

  if (isActive || isCollapsed || isAdmin) {
    return content
  }

  return ''
}

export default resolver

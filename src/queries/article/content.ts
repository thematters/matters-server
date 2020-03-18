import { ARTICLE_STATE } from 'common/enums'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = (
  { content, state, authorId },
  _,
  { viewer }
) => {
  const isActive = state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isActive || isAdmin || isAuthor) {
    return content
  }

  return ''
}

export default resolver

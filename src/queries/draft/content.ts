import { correctHtml } from 'common/utils/index.js'
import { DraftToContentResolver } from 'definitions'

// ACL for article content
const resolver: DraftToContentResolver = async (
  { authorId, content },
  _,
  { viewer }
) => {
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    return correctHtml(content)
  }

  return ''
}

export default resolver

import { connectionFromPromisedArray, cursorToIndex } from 'common/utils'
import { ArticleToDraftsResolver } from 'definitions'

const resolver: ArticleToDraftsResolver = async (
  { articleId, authorId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  const isAuthor = authorId === viewer.id
  if (!isAuthor) {
    return []
  }
  return draftService.findByArticleId({ articleId })
}

export default resolver

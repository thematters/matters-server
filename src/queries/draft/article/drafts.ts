import {
  connectionFromPromisedArray,
  correctHtml,
  cursorToIndex,
} from 'common/utils'
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
  const drafts = (await draftService.findValidByArticleId({ articleId })).map(
    (draft) => ({
      ...draft,
      content: correctHtml(draft.content),
    })
  )
  return drafts
}

export default resolver

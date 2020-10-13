import { ARTICLE_STATE } from 'common/enums'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { draftId, state, authorId },
  _,
  { viewer, dataSources: { draftService } }
) => {
  const isActive = state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isActive || isAdmin || isAuthor) {
    // find the linked draft
    const draft = await draftService.dataloader.load(draftId)
    if (draft && draft.content) {
      return draft.content
    }
  }

  return ''
}

export default resolver

import { stripHtml } from 'common/utils'
import { ArticleToLanguageResolver } from 'definitions'

const resolver: ArticleToLanguageResolver = async (
  { draftId, language: storedLanguage },
  _,
  { dataSources: { articleService, draftService } }
) => {
  if (storedLanguage) {
    return storedLanguage
  }

  // fetch data from latest linked draft
  const draft = await draftService.dataloader.load(draftId)
  if (draft && draft.content) {
    articleService
      .detectLanguage(stripHtml(draft.content.slice(0, 300)))
      .then((language) => language && draftService.baseUpdate(draftId, { language }))
  }
  // return first to prevent blocking
  return
}

export default resolver

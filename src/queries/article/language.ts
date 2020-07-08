import { stripHtml } from 'common/utils'
import { ArticleToLanguageResolver } from 'definitions'

const resolver: ArticleToLanguageResolver = (
  { id, content, language: storedLanguage },
  _,
  { dataSources: { articleService } }
) => {
  if (storedLanguage) {
    return storedLanguage
  }

  articleService
    .detectLanguage(stripHtml(content.slice(0, 300)))
    .then((language) => language && articleService.baseUpdate(id, { language }))
  // return  first to prevent blocking
  return
}

export default resolver

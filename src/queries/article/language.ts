import { stripHtml } from '@matters/matters-html-formatter'

import { ArticleToLanguageResolver } from 'definitions'

const resolver: ArticleToLanguageResolver = async (
  { id, content, language: storedLanguage },
  _,
  { dataSources: { articleService, draftService } }
) => {
  if (storedLanguage) {
    return storedLanguage
  }

  articleService
    .detectLanguage(stripHtml(content.slice(0, 300)))
    .then((language) => language && draftService.baseUpdate(id, { language }))

  // return first to prevent blocking
  return
}

export default resolver

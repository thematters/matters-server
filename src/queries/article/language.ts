import { stripHtml } from '@matters/ipns-site-generator'

import { gcp } from 'connectors/index.js'
import { ArticleToLanguageResolver } from 'definitions'

const resolver: ArticleToLanguageResolver = async (
  { id, content, language: storedLanguage },
  _,
  { dataSources: { draftService } }
) => {
  if (storedLanguage) {
    return storedLanguage
  }

  gcp
    .detectLanguage(stripHtml(content.slice(0, 300)))
    .then((language) => language && draftService.baseUpdate(id, { language }))

  // return first to prevent blocking
  return
}

export default resolver

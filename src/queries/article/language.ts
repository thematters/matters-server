import type { GQLArticleResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'

import { GCP } from 'connectors'

const resolver: GQLArticleResolvers['language'] = async (
  { id, content, language: storedLanguage },
  _,
  { dataSources: { draftService } }
) => {
  if (storedLanguage) {
    return storedLanguage
  }

  const gcp = new GCP()

  gcp
    .detectLanguage(stripHtml(content.slice(0, 300)))
    .then((language) => language && draftService.baseUpdate(id, { language }))

  // return first to prevent blocking
  return null
}

export default resolver

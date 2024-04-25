import type { GQLArticleResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'

import { GCP } from 'connectors'

const resolver: GQLArticleResolvers['language'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService, atomService } }
) => {
  const {
    id: versionId,
    language: storedLanguage,
    contentId,
    content: draftContent,
  } = await articleService.loadLatestArticleVersion(articleId)
  if (storedLanguage) {
    return storedLanguage
  }

  const gcp = new GCP()

  const content = draftContent
    ? draftContent
    : (await atomService.articleContentIdLoader.load(contentId)).content

  gcp.detectLanguage(stripHtml(content.slice(0, 300))).then((language) => {
    language &&
      atomService.update({
        table: 'article_version',
        where: { id: versionId },
        data: { language },
      })
  })

  // return first to prevent blocking
  return null
}

export default resolver

import type { GQLArticleResolvers } from '#definitions/index.js'

import { stripHtml, stripMentions } from '#common/utils/index.js'
import { GCP } from '#connectors/index.js'

const resolver: GQLArticleResolvers['language'] = async (
  { id: articleId, isSpam, spamScore },
  _,
  { dataSources: { articleService, atomService, systemService } }
) => {
  const {
    id: versionId,
    language: storedLanguage,
    contentId,
  } = await articleService.loadLatestArticleVersion(articleId)
  if (storedLanguage) {
    return storedLanguage
  }

  // Skip if article is marked as spam by admin
  if (isSpam === true) {
    return null
  }

  // Skip if article's spam score exceeds threshold
  const spamThreshold = await systemService.getSpamThreshold()
  if (spamThreshold && spamScore && spamScore >= spamThreshold) {
    return null
  }

  // Detect language
  const gcp = new GCP()

  const { content } = await atomService.articleContentIdLoader.load(contentId)

  const excerpt = stripHtml(stripMentions(content)).slice(0, 300)

  gcp.detectLanguage(excerpt).then((language) => {
    if (language) {
      atomService.update({
        table: 'article_version',
        where: { id: versionId },
        data: { language },
      })
    }
  })

  // return first to prevent blocking
  return null
}

export default resolver

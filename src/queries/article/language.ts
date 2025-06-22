import type { GQLArticleResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { PublicationService } from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLArticleResolvers['language'] = async (
  { id: articleId, isSpam, spamScore },
  _,
  { dataSources: { articleService, atomService, systemService, connections } }
) => {
  const { id: articleVersionId, language: storedLanguage } =
    await articleService.loadLatestArticleVersion(articleId)

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
  const publicationService = new PublicationService(connections)
  publicationService
    .detectLanguage(articleVersionId)
    .then((language: string | null) => {
      if (!language) {
        return
      }

      atomService.update({
        table: 'article_version',
        where: { id: articleVersionId },
        data: { language },
      })

      // invalidate article
      invalidateFQC({
        node: { type: NODE_TYPES.Article, id: articleId },
        redis: connections.redis,
      })
    })

  return null
}

export default resolver

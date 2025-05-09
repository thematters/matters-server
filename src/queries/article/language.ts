import type { GQLArticleResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const resolver: GQLArticleResolvers['language'] = async (
  { id: articleId, isSpam, spamScore },
  _,
  {
    dataSources: {
      articleService,
      atomService,
      systemService,
      connections: { redis },
    },
  }
) => {
  const { id: versionId, language: storedLanguage } =
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
  const language = await articleService.detectLanguage(articleId)
  if (language) {
    await atomService.update({
      table: 'article_version',
      where: { id: versionId },
      data: { language },
    })

    // invalidate article
    invalidateFQC({
      node: { type: NODE_TYPES.Article, id: articleId },
      redis,
    })

    return language
  }

  return null
}

export default resolver

import type { GQLArticleResolvers } from '#definitions/index.js'

import { stripMentions } from '#common/utils/index.js'
import { GCP } from '#connectors/index.js'
import { stripHtml } from '@matters/ipns-site-generator'

const resolver: GQLArticleResolvers['language'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService, atomService } }
) => {
  const {
    id: versionId,
    language: storedLanguage,
    contentId,
  } = await articleService.loadLatestArticleVersion(articleId)
  if (storedLanguage) {
    return storedLanguage
  }

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

import type { GQLArticleResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'

import { GCP } from 'connectors'
import { stripMentions } from 'common/utils'

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

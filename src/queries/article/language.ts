import type { GQLArticleResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'

import { stripMentions } from 'common/utils'
import { Manager } from 'connectors/translation/manager'
import { toInternalLanguage } from 'connectors/translation/utils'

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

  const { content } = await atomService.articleContentIdLoader.load(contentId)

  const excerpt = stripHtml(stripMentions(content)).slice(0, 300)

  Manager.getInstance()
    .translator()
    .detect(excerpt)
    .then((language) => {
      language &&
        atomService.update({
          table: 'article_version',
          where: { id: versionId },
          data: { language: toInternalLanguage(language) },
        })
    })

  // return first to prevent blocking
  return null
}

export default resolver

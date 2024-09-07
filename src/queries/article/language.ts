import type { GQLArticleResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'

import { getLogger } from 'common/logger'
import { stripMentions } from 'common/utils'
import { Manager, Translator } from 'connectors/translation/manager'
import { ManageInternalLanguage } from 'connectors/translation/matters'

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

  const translator = Manager.getInstance().translator()

  translator
    .detect(excerpt)
    .then((language) => {
      language &&
        atomService.update({
          table: 'article_version',
          where: { id: versionId },
          data: {
            language:
              'toInternalLanguage' in translator
                ? (
                    translator as Translator & ManageInternalLanguage
                  ).toInternalLanguage(language)
                : language,
          },
        })
    })
    .catch((e) => {
      getLogger('translation').error(e)
    })

  // return first to prevent blocking
  return null
}

export default resolver

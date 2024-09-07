import type { GQLArticleResolvers } from 'definitions'

import { getLogger } from 'common/logger'

const resolver: GQLArticleResolvers['translation'] = async (
  { id: articleId },
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const language = input && input.language ? input.language : viewer.language
  const articleVersion = await articleService.loadLatestArticleVersion(
    articleId
  )

  try {
    return articleService.getOrCreateTranslation(
      articleVersion,
      language,
      viewer.id
    )
  } catch (e) {
    getLogger('translation').error(e)

    return null
  }
}
export default resolver

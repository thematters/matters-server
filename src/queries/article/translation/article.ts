import type { GQLArticleResolvers } from '#definitions/index.js'

import { UserInputError } from '#common/errors.js'

const resolver: GQLArticleResolvers['translation'] = async (
  { id: articleId },
  { input },
  { viewer, dataSources: { articleService } }
) => {
  if (input?.model === 'google_translation_v2') {
    throw new UserInputError('"google_translation_v2" is no longer supported')
  }

  const language = input && input.language ? input.language : viewer.language
  const articleVersion = await articleService.loadLatestArticleVersion(
    articleId
  )

  return articleService.getOrCreateTranslation(
    articleVersion,
    language,
    viewer.id,
    input?.model
  )
}
export default resolver

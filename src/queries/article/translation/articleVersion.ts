import type { GQLArticleVersionResolvers } from 'definitions'

import { getLogger } from 'common/logger'

const resolver: GQLArticleVersionResolvers['translation'] = async (
  root,
  { input },
  { viewer, dataSources: { articleService } }
) => {
  const language = input && input.language ? input.language : viewer.language

  try {
    return articleService.getOrCreateTranslation(root, language, viewer.id)
  } catch (e) {
    getLogger('translation').error(e)

    return null
  }
}
export default resolver

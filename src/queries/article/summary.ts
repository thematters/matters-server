import type { GQLArticleResolvers } from '#definitions/index.js'

import { ARTICLE_ACCESS_TYPE } from '#common/enums/index.js'
import { makeSummary } from '#common/utils/index.js'

const resolver: GQLArticleResolvers['summary'] = async (
  { id },
  _,
  { dataSources: { articleService, atomService } }
) => {
  const { summary, contentId, summaryCustomized } =
    await articleService.loadLatestArticleVersion(id)

  const accessType = await articleService.getAccess(id)

  if (accessType === ARTICLE_ACCESS_TYPE.paywall) {
    if (!summaryCustomized) {
      return '' // drop pre-computed summary if not summaryCustomized
    }
    return summary || ''
  }

  const { content } = await atomService.articleContentIdLoader.load(contentId)
  return summary || makeSummary(content)
}

export default resolver

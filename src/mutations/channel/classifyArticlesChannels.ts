import type { GQLMutationResolvers } from 'definitions'

import { AuthenticationError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['classifyArticlesChannels'] = async (
  _,
  { input: { ids } },
  { viewer, dataSources: { systemService, atomService, channelService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const articleIds = ids.map((id) => fromGlobalId(id).id)

  // filter spam articles
  const spamThreshold = await systemService.getSpamThreshold()
  const articles = await atomService.findMany({
    table: 'article',
    whereIn: ['id', articleIds],
  })
  const filteredArticleIds = articles
    .filter((article) => {
      if (article.isSpam) {
        return false
      }

      if (!article.spamScore) {
        return true
      }

      if (spamThreshold && article.spamScore >= spamThreshold) {
        return false
      }

      return true
    })
    .map((article) => article.id)

  await channelService.classifyArticlesChannels({ ids: filteredArticleIds })

  return true
}

export default resolver

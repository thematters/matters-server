import type { GQLMutationResolvers } from 'definitions'

import { ARTICLE_CHANNEL_JOB_STATE } from 'common/enums'
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

  const nonSpamArticleIds = articles
    .filter((article) => {
      if (typeof article.isSpam === 'boolean') {
        return !article.isSpam
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

  // filter articles that already have channel classification
  const articleChannelJobs = await atomService.findMany({
    table: 'article_channel_job',
    whereIn: ['articleId', nonSpamArticleIds],
  })
  const filteredArticleIds = nonSpamArticleIds.filter(
    (articleId) =>
      !articleChannelJobs.some(
        (job) =>
          job.articleId === articleId &&
          (job.state === ARTICLE_CHANNEL_JOB_STATE.finished ||
            job.state === ARTICLE_CHANNEL_JOB_STATE.processing)
      )
  )

  await channelService.classifyArticlesChannels({ ids: filteredArticleIds })

  return true
}

export default resolver

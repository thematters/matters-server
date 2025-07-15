import type { GQLTopicChannelClassificationResolvers } from '#definitions/index.js'

import {
  ARTICLE_CHANNEL_JOB_STATE,
  USER_FEATURE_FLAG_TYPE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'

const resolver: GQLTopicChannelClassificationResolvers['channels'] = async (
  { id: articleId, authorId, isSpam: _isSpam, spamScore: _spamScore },
  _,
  { dataSources: { atomService, channelService, systemService } }
) => {
  // TODO: move to ArticleService
  const pypassSpam = !!(await atomService.findFirst({
    table: 'user_feature_flag',
    where: {
      userId: authorId,
      type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection,
    },
  }))
  const spamThreshold = (await systemService.getSpamThreshold()) || 1
  const spamScore = _spamScore ?? 1
  const isSpam = _isSpam ?? (pypassSpam ? false : spamScore > spamThreshold)

  if (isSpam) {
    return []
  }

  const articleChannels = await atomService.findMany({
    table: 'topic_channel_article',
    where: { articleId },
  })

  const jobs = await atomService.findMany({
    table: 'article_channel_job',
    where: { articleId, state: ARTICLE_CHANNEL_JOB_STATE.finished },
  })

  if (!articleChannels.length) {
    return jobs.length > 0 ? [] : null
  }

  // Get all topic channels
  const channels = await atomService.findMany({
    table: 'topic_channel',
    whereIn: ['id', articleChannels.map((ac) => ac.channelId)],
  })

  // Create a map for quick channel lookup
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]))
  const floodDetectWindow = new Date(
    Date.now() - environment.channelFloodDetectWindowInSeconds * 1000
  )

  // Map article channels to ArticleTopicChannel type
  return articleChannels.map(async (ac) => {
    const channel = channelMap.get(ac.channelId)
    const pinnedArticles = channel?.pinnedArticles || []
    return {
      channel: {
        ...(channel as any),
        __type: 'TopicChannel',
      },
      score: ac.score,
      isLabeled: ac.isLabeled,
      enabled: ac.enabled,
      classicfiedAt: ac.createdAt,
      pinned: pinnedArticles.includes(articleId),
      antiFlooded:
        ac.createdAt > floodDetectWindow &&
        (await channelService.isFlood({
          articleId,
          channelId: ac.channelId,
        })),
    }
  })
}

export default resolver

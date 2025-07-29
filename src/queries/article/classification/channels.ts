import type {
  GQLTopicChannelClassificationResolvers,
  TopicChannel,
} from '#definitions/index.js'

import { ARTICLE_CHANNEL_JOB_STATE } from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import flatten from 'lodash/flatten.js'
import uniqBy from 'lodash/uniqBy.js'

const resolver: GQLTopicChannelClassificationResolvers['channels'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService, channelService, publicationService } }
) => {
  if (await publicationService.isSpam(articleId)) {
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
  const result = await Promise.all(
    articleChannels.map(async (ac) => {
      const channel = channelMap.get(ac.channelId) as TopicChannel
      // if channel has parentId, and parentId is not in channelMap (means this parent channel is not labeled directly),
      // then it has parent channel to add to result
      const hasParentToAdd =
        channel.parentId && !channelMap.get(channel.parentId)
      const parentChannel = hasParentToAdd
        ? await atomService.findUnique({
            table: 'topic_channel',
            where: { id: channel.parentId as string },
          })
        : null
      return [
        {
          channel: {
            ...channel,
            __type: 'TopicChannel',
          },
          score: ac.score,
          isLabeled: ac.isLabeled,
          enabled: ac.enabled,
          classicfiedAt: ac.createdAt,
          pinned: channel.pinnedArticles?.includes(articleId) || false,
          antiFlooded:
            ac.createdAt > floodDetectWindow &&
            (await channelService.isFlood({
              articleId,
              channelId: ac.channelId,
            })),
        },
        ...(hasParentToAdd
          ? [
              {
                channel: {
                  ...(parentChannel as TopicChannel),
                  __type: 'TopicChannel',
                },
                score: null,
                isLabeled: false,
                enabled: ac.enabled,
                classicfiedAt: ac.createdAt,
                pinned:
                  parentChannel?.pinnedArticles?.includes(articleId) || false,
                antiFlooded:
                  ac.createdAt > floodDetectWindow &&
                  (await channelService.isFlood({
                    articleId,
                    channelId: parentChannel?.id as string,
                  })),
              },
            ]
          : []),
      ]
    })
  )
  return uniqBy(flatten(result), 'channel.id')
}

export default resolver

import type { GQLTopicChannelClassificationResolvers } from '#definitions/index.js'

const resolver: GQLTopicChannelClassificationResolvers['channels'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const articleChannels = await atomService.findMany({
    table: 'topic_channel_article',
    where: { articleId },
  })

  if (!articleChannels.length) {
    return []
  }

  // Get all topic channels
  const channels = await atomService.findMany({
    table: 'topic_channel',
    whereIn: ['id', articleChannels.map((ac) => ac.channelId)],
  })

  // Create a map for quick channel lookup
  const channelMap = new Map(channels.map((channel) => [channel.id, channel]))

  // Map article channels to ArticleTopicChannel type
  return articleChannels.map((ac) => ({
    channel: {
      ...(channelMap.get(ac.channelId) as any),
      __type: 'TopicChannel',
    },
    score: ac.score,
    isLabeled: ac.isLabeled,
    enabled: ac.enabled,
    classicfiedAt: ac.createdAt,
    pinned: ac.pinned,
    antiFlood: false,
  }))
}

export default resolver

import type {
  GQLArticleOssResolvers,
  TopicChannel,
} from '#definitions/index.js'

export const boost: GQLArticleOssResolvers['boost'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const articleBoost = await atomService.findFirst({
    table: 'article_boost',
    where: { articleId },
  })

  if (!articleBoost) {
    return 1
  }

  return articleBoost.boost
}

export const score: GQLArticleOssResolvers['score'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const article = await atomService.findUnique({
    table: 'article_count_view',
    where: { id: articleId },
  })
  return article?.score || 0
}

export const inRecommendIcymi: GQLArticleOssResolvers['inRecommendIcymi'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const record = await atomService.findFirst({
      table: 'matters_choice',
      where: { articleId },
    })
    return !!record
  }

export const inRecommendHottest: GQLArticleOssResolvers['inRecommendHottest'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const setting = await atomService.findFirst({
      table: 'article_recommend_setting',
      where: { articleId },
    })

    if (!setting) {
      return true
    }

    return setting.inHottest
  }

export const inRecommendNewest: GQLArticleOssResolvers['inRecommendNewest'] =
  async ({ id: articleId }, _, { dataSources: { atomService } }) => {
    const setting = await atomService.findFirst({
      table: 'article_recommend_setting',
      where: { articleId },
    })

    if (!setting) {
      return true
    }

    return setting.inNewest
  }

export const inSearch: GQLArticleOssResolvers['inSearch'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const setting = await atomService.findFirst({
    table: 'article_recommend_setting',
    where: { articleId },
  })

  if (!setting) {
    return true
  }

  return setting.inSearch
}

export const spamStatus: GQLArticleOssResolvers['spamStatus'] = async (
  { id, spamScore, isSpam },
  _,
  { dataSources: { articleService } }
) => {
  if (!spamScore) {
    articleService.detectSpam(id)
  }

  return { score: spamScore, isSpam }
}

export const topicChannels: GQLArticleOssResolvers['topicChannels'] = async (
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

  const channels = await atomService.findMany({
    table: 'topic_channel',
    whereIn: ['id', articleChannels.map((ac) => ac.channelId)],
  })

  const channelMap = new Map(channels.map((channel) => [channel.id, channel]))

  return articleChannels.map((ac) => ({
    channel: {
      ...(channelMap.get(ac.channelId) as TopicChannel),
      __type: 'TopicChannel',
    },
    score: ac.score,
    isLabeled: ac.isLabeled,
    enabled: ac.enabled,
  }))
}

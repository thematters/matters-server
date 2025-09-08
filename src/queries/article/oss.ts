import type { GQLArticleOssResolvers } from '#definitions/index.js'

import { NODE_TYPES } from '#common/enums/index.js'

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
  { dataSources: { publicationService } }
) => {
  if (!spamScore) {
    publicationService.detectSpam(id)
  }

  return { score: spamScore, isSpam }
}

export const adStatus: GQLArticleOssResolvers['adStatus'] = async ({
  isAd,
}) => {
  return { isAd }
}

export const pinHistory: GQLArticleOssResolvers['pinHistory'] = async (
  { id: articleId },
  _,
  { dataSources: { atomService } }
) => {
  const pinHistoryItems = []

  // Check if article was pinned in ICYMI (matters_choice)
  const mattersChoice = await atomService.findFirst({
    table: 'matters_choice',
    where: { articleId },
  })

  if (mattersChoice) {
    // Get the ICYMI topic that contains this article
    const icymiTopic = await atomService.findFirst({
      table: 'matters_choice_topic',
      where: (builder) => builder.where('articles', '@>', `{ ${articleId} }`),
      orderBy: [{ column: 'publishedAt', order: 'desc' }],
    })

    if (icymiTopic) {
      pinHistoryItems.push({
        feed: { ...icymiTopic, __type: NODE_TYPES.IcymiTopic },
        pinnedAt: icymiTopic.publishedAt || icymiTopic.createdAt,
      })
    }
  }

  // Check if article was pinned in topic channels
  const topicChannelArticles = await atomService.findMany({
    table: 'topic_channel_article',
    where: (builder) =>
      builder.where('articleId', articleId).whereNotNull('pinnedAt'),
  })

  for (const topicChannelArticle of topicChannelArticles) {
    const topicChannel = await atomService.topicChannelIdLoader.load(
      topicChannelArticle.channelId
    )
    if (topicChannel) {
      pinHistoryItems.push({
        feed: { ...topicChannel, __type: NODE_TYPES.TopicChannel },
        pinnedAt: topicChannelArticle.pinnedAt!,
      })
    }
  }

  // Check if article was pinned in curation channels
  const curationChannelArticles = await atomService.findMany({
    table: 'curation_channel_article',
    where: (builder) =>
      builder.where('articleId', articleId).whereNotNull('pinnedAt'),
  })

  for (const curationChannelArticle of curationChannelArticles) {
    const curationChannel = await atomService.curationChannelIdLoader.load(
      curationChannelArticle.channelId
    )
    if (curationChannel) {
      pinHistoryItems.push({
        feed: { ...curationChannel, __type: NODE_TYPES.CurationChannel },
        pinnedAt: curationChannelArticle.pinnedAt!,
      })
    }
  }

  // Check if article was pinned in tags
  const tagArticles = await atomService.findMany({
    table: 'article_tag',
    where: (builder) =>
      builder.where('articleId', articleId).whereNotNull('pinnedAt'),
  })

  for (const tagArticle of tagArticles) {
    const tag = await atomService.tagIdLoader.load(tagArticle.tagId)
    if (tag) {
      pinHistoryItems.push({
        feed: { ...tag, __type: NODE_TYPES.Tag },
        pinnedAt: tagArticle.pinnedAt!,
      })
    }
  }

  // Sort by pinnedAt in descending order (most recent first)
  pinHistoryItems.sort((a, b) => {
    return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
  })

  return pinHistoryItems
}

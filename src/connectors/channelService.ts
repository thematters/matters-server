import type {
  ArticleVersion,
  CampaignChannel,
  Connections,
  ValueOf,
} from '#definitions/index.js'

import {
  ARTICLE_CHANNEL_JOB_STATE,
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
} from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import { shortHash, toDatetimeRangeString } from '#common/utils/index.js'
import {
  ArticleService,
  AtomService,
  ChannelClassifier,
} from '#connectors/index.js'
const logger = getLogger('service-channel')

export class ChannelService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public updateOrCreateChannel = async ({
    id,
    name,
    note,
    providerId,
    enabled,
  }: {
    id?: string
    name: string
    note?: string
    providerId?: string
    enabled?: boolean
  }) => {
    // update
    if (id) {
      return this.models.update({
        table: 'channel',
        where: { id },
        data: { name, note, enabled, updatedAt: new Date() },
      })
    }

    return this.models.create({
      table: 'channel',
      data: { shortHash: shortHash(), name, note, providerId, enabled },
    })
  }

  public updateOrCreateCampaignChannel = async ({
    campaignId,
    enabled,
  }: Pick<CampaignChannel, 'campaignId' | 'enabled'>) => {
    if (enabled) {
      await this.models.updateMany({
        table: 'campaign_channel',
        where: {},
        data: { enabled: false },
      })
    }
    return this.models.upsert({
      table: 'campaign_channel',
      where: { campaignId },
      create: { campaignId, enabled },
      update: { enabled },
    })
  }

  public createCurationChannel = async ({
    name,
    note,
    pinAmount = 3,
    color = CURATION_CHANNEL_COLOR.gray,
    activePeriod = [new Date(0), new Date(0)],
    state = CURATION_CHANNEL_STATE.editing,
  }: {
    name: string
    note?: string
    pinAmount?: number
    color?: ValueOf<typeof CURATION_CHANNEL_COLOR>
    activePeriod?: readonly [Date, Date]
    state?: ValueOf<typeof CURATION_CHANNEL_STATE>
  }) => {
    return this.models.create({
      table: 'curation_channel',
      data: {
        shortHash: shortHash(),
        name,
        note,
        pinAmount,
        color,
        activePeriod: toDatetimeRangeString(activePeriod[0], activePeriod[1]),
        state,
      },
    })
  }

  public updateCurationChannel = async ({
    id,
    name,
    note,
    pinAmount,
    color,
    activePeriod,
    state,
  }: {
    id: string
    name?: string
    note?: string | null
    pinAmount?: number
    color?: ValueOf<typeof CURATION_CHANNEL_COLOR>
    activePeriod?: readonly [Date, Date]
    state?: ValueOf<typeof CURATION_CHANNEL_STATE>
  }) => {
    return this.models.update({
      table: 'curation_channel',
      where: { id },
      data: {
        name,
        note,
        pinAmount,
        color,
        activePeriod: activePeriod
          ? toDatetimeRangeString(activePeriod[0], activePeriod[1])
          : undefined,
        state,
      },
    })
  }

  public setArticleTopicChannels = async ({
    articleId,
    channelIds,
  }: {
    articleId: string
    channelIds: string[]
  }) => {
    // Get existing channels
    const existingChannels = await this.models.findMany({
      table: 'article_channel',
      where: { articleId },
    })

    // Track both id and enabled status
    const existingChannelMap = new Map(
      existingChannels.map((c) => [c.channelId, c.enabled])
    )

    // Diff channels
    const toAdd = channelIds.filter(
      (id) =>
        !existingChannelMap.has(id) || existingChannelMap.get(id) === false
    )
    const toRemove = [...existingChannelMap.entries()]
      .filter(([id, enabled]) => enabled && !channelIds.includes(id))
      .map(([id]) => id)

    // Add new channels or re-enable disabled ones
    if (toAdd.length > 0) {
      await this.models.upsertOnConflict({
        table: 'article_channel',
        data: toAdd.map((channelId) => ({
          articleId,
          channelId,
          enabled: true,
          isLabeled: true,
        })),
        onConflict: ['articleId', 'channelId'],
      })
    }

    // Disable removed channels
    if (toRemove.length > 0) {
      await this.models.updateMany({
        table: 'article_channel',
        where: { articleId },
        whereIn: ['channelId', toRemove],
        data: { enabled: false, isLabeled: true, updatedAt: new Date() },
      })
    }
  }

  public classifyArticlesChannels = async ({
    ids,
    classifier,
  }: {
    ids: string[]
    classifier?: ChannelClassifier
  }) => {
    const articleService = new ArticleService(this.connections)
    const channelClassifier = classifier ?? new ChannelClassifier()

    const articleVersions = (await articleService.loadLatestArticlesVersion(
      ids
    )) as ArticleVersion[]
    const contentIds = articleVersions.map(({ contentId }) => contentId)
    const contents = await articleService.loadLatestArticlesContentByContentIds(
      contentIds
    )

    await this._classifyArticlesChannels(
      contents.map((content, index) => ({
        id: ids[index],
        title: articleVersions[index].title || '',
        content: content.content || '',
        summary: articleVersions[index].summaryCustomized
          ? articleVersions[index].summary
          : undefined,
      })),
      channelClassifier
    )
  }

  private _classifyArticlesChannels = async (
    articles: Array<{
      id: string
      title: string
      content: string
      summary?: string
    }>,
    classifier: ChannelClassifier
  ) => {
    const channelClassifier = classifier ?? new ChannelClassifier()
    const texts = articles.map(({ title, summary, content }) =>
      summary ? `${title}\n${summary}\n${content}` : `${title}\n${content}`
    )
    const result = await channelClassifier.classify(texts)

    if (!result) {
      return
    }

    const results = await Promise.all(
      result.map(async ({ state, jobId }, index) => {
        const article = articles[index]
        logger.info(
          `Channel classification for article ${article.id}: ${state} ${jobId}`
        )
        await this.models.upsertOnConflict({
          table: 'article_channel_job',
          data: {
            articleId: article.id,
            jobId,
            // force into processing state and update result from Lambda
            state: ARTICLE_CHANNEL_JOB_STATE.processing,
          },
          onConflict: ['articleId', 'jobId'],
        })
        return { state, jobId }
      })
    )
    return results
  }

  public addArticlesToCurationChannel = async ({
    channelId,
    articleIds,
  }: {
    channelId: string
    articleIds: string[]
  }) => {
    // Get existing articles in channel
    const existingArticles = await this.models.findMany({
      table: 'curation_channel_article',
      where: { channelId },
    })

    // Filter out articles that are already in the channel
    const existingArticleIds = existingArticles.map(
      ({ articleId }) => articleId
    )
    const newArticleIds = articleIds.filter(
      (id) => !existingArticleIds.includes(id)
    )

    // Add new articles
    if (newArticleIds.length > 0) {
      await this.models.upsertOnConflict({
        table: 'curation_channel_article',
        data: newArticleIds.map((articleId) => ({
          channelId,
          articleId,
          pinned: false,
        })),
        onConflict: ['channelId', 'articleId'],
      })
    }
  }

  /**
   * Find articles for a curation channel  with order column considering pinned flag
   */
  public findCurationChannelArticles = (channelId: string) => {
    const knexRO = this.connections.knexRO
    return knexRO('article')
      .select(
        'article.*',
        knexRO.raw(
          'RANK() OVER (ORDER BY curation_channel_article.pinned_at DESC) AS order'
        )
      )
      .join(
        'curation_channel_article',
        'article.id',
        'curation_channel_article.article_id'
      )
      .where({ channelId, 'curation_channel_article.pinned': true })
      .union(
        knexRO('article')
          .select(
            'article.*',
            knexRO.raw(
              'RANK() OVER (ORDER BY curation_channel_article.created_at DESC) + 100 AS order'
            )
          )
          .join(
            'curation_channel_article',
            'article.id',
            'curation_channel_article.article_id'
          )
          .where({ channelId, 'curation_channel_article.pinned': false })
      )
  }
}

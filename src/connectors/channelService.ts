import type {
  ArticleVersion,
  CampaignChannel,
  CurationChannel,
  Connections,
  ValueOf,
} from '#definitions/index.js'

import {
  ARTICLE_CHANNEL_JOB_STATE,
  ARTICLE_STATE,
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
  NODE_TYPES,
  TOPIC_CHANNEL_PIN_LIMIT,
} from '#common/enums/index.js'
import {
  EntityNotFoundError,
  ActionLimitExceededError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  shortHash,
  toDatetimeRangeString,
  excludeSpam as excludeSpamModifier,
} from '#common/utils/index.js'
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
        table: 'topic_channel',
        where: { id },
        data: { name, note, enabled, updatedAt: new Date() },
      })
    }

    return this.models.create({
      table: 'topic_channel',
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

  public updateChannelOrder = async (
    {
      type,
      id,
    }: {
      type: NODE_TYPES
      id: string
    },
    order: number
  ) => {
    switch (type) {
      case NODE_TYPES.TopicChannel:
        return this.models.update({
          table: 'topic_channel',
          where: { id },
          data: { order },
        })
      case NODE_TYPES.CurationChannel:
        return this.models.update({
          table: 'curation_channel',
          where: { id },
          data: { order },
        })
      case NODE_TYPES.Campaign:
        return this.models.update({
          table: 'campaign_channel',
          where: { campaignId: id },
          data: { order },
        })
      default:
        throw new Error(`Unsupported node type: ${type}`)
    }
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
      table: 'topic_channel_article',
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
        table: 'topic_channel_article',
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
        table: 'topic_channel_article',
        where: { articleId },
        whereIn: ['channelId', toRemove],
        data: { enabled: false, isLabeled: true, updatedAt: new Date() },
      })
    }
  }

  /**
   * Find articles for a topic channel with order column considering pinned flag
   */
  public findTopicChannelArticles = (
    channelId: string,
    {
      channelThreshold,
      spamThreshold,
    }: {
      channelThreshold?: number
      spamThreshold?: number
    } = {}
  ) => {
    const knexRO = this.connections.knexRO
    const pinnedQuery = knexRO
      .select(
        'article.*',
        knexRO.raw('topic_channel_article.score AS channel_score'),
        knexRO.raw('topic_channel_article.is_labeled AS channel_is_labeled'),
        knexRO.raw(
          'RANK() OVER (ORDER BY topic_channel_article.pinned_at DESC) AS order'
        )
      )
      .from('topic_channel_article')
      .leftJoin('article', 'topic_channel_article.article_id', 'article.id')
      .where({
        'topic_channel_article.channel_id': channelId,
        'topic_channel_article.enabled': true,
        'topic_channel_article.pinned': true,
        'article.state': ARTICLE_STATE.active,
      })

    const unpinnedQuery = knexRO
      .select(
        'article.*',
        knexRO.raw('topic_channel_article.score AS channel_score'),
        knexRO.raw('topic_channel_article.is_labeled AS channel_is_labeled'),
        knexRO.raw(
          'RANK() OVER (ORDER BY article.created_at DESC) + 100 AS order'
        )
      )
      .from('topic_channel_article')
      .leftJoin('article', 'topic_channel_article.article_id', 'article.id')
      .where({
        'topic_channel_article.channel_id': channelId,
        'topic_channel_article.enabled': true,
        'topic_channel_article.pinned': false,
        'article.state': ARTICLE_STATE.active,
      })

    const base = pinnedQuery.union(unpinnedQuery).as('base')

    return knexRO(base)
      .where((builder) => {
        if (channelThreshold) {
          builder.where((qb) => {
            qb.where('channel_score', '>=', channelThreshold).orWhere(
              'channel_is_labeled',
              true
            )
          })
        }
      })
      .where((builder) => {
        if (spamThreshold) {
          builder.modify(excludeSpamModifier, spamThreshold, 'base')
        }
      })
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

  public findActiveCurationChannels = async () => {
    const knexRO = this.connections.knexRO
    return knexRO('curation_channel')
      .select('*')
      .where({ state: CURATION_CHANNEL_STATE.published })
      .whereRaw('active_period @> NOW()')
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
      .where({
        channelId,
        'curation_channel_article.pinned': true,
        'article.state': ARTICLE_STATE.active,
      })
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
          .where({
            channelId,
            'curation_channel_article.pinned': false,
            'article.state': ARTICLE_STATE.active,
          })
      )
  }

  public togglePinChannelArticles = async ({
    channelId,
    channelType,
    articleIds,
    pinned,
  }: {
    channelId: string
    channelType: NODE_TYPES.TopicChannel | NODE_TYPES.CurationChannel
    articleIds: string[]
    pinned: boolean
  }) => {
    // Get channel to check pin limit
    const channel = await this.models.findUnique({
      table:
        channelType === NODE_TYPES.TopicChannel
          ? 'topic_channel'
          : 'curation_channel',
      where: { id: channelId },
    })

    if (!channel) {
      throw new EntityNotFoundError('channel not found')
    }

    if (articleIds.length === 0) {
      return channel
    }

    const maxPinAmount =
      channelType === NODE_TYPES.TopicChannel
        ? TOPIC_CHANNEL_PIN_LIMIT
        : (channel as CurationChannel).pinAmount

    // If pinning, check if it would exceed the limit
    if (pinned) {
      const currentPinnedCount = await this.models.count({
        table:
          channelType === NODE_TYPES.TopicChannel
            ? 'topic_channel_article'
            : 'curation_channel_article',
        where: {
          channelId,
          pinned: true,
        },
      })
      const unpinnedArticleCount = await this.models.count({
        table:
          channelType === NODE_TYPES.TopicChannel
            ? 'topic_channel_article'
            : 'curation_channel_article',
        where: { channelId, pinned: false },
        whereIn: ['articleId', articleIds],
      })

      if (currentPinnedCount + unpinnedArticleCount > maxPinAmount) {
        throw new ActionLimitExceededError(
          `Cannot pin more than ${maxPinAmount} articles in this channel`
        )
      }
    }

    // Update pin status for articles
    const now = new Date()
    await this.models.updateMany({
      table:
        channelType === NODE_TYPES.TopicChannel
          ? 'topic_channel_article'
          : 'curation_channel_article',
      where: { channelId },
      whereIn: ['articleId', articleIds],
      data: {
        pinned,
        pinnedAt: pinned ? now : null,
      },
    })

    return channel
  }
}

import type {
  ArticleVersion,
  CampaignChannel,
  CurationChannel,
  Connections,
  ValueOf,
  TopicChannelFeedback,
} from '#definitions/index.js'

import {
  ARTICLE_CHANNEL_JOB_STATE,
  ARTICLE_STATE,
  CURATION_CHANNEL_COLOR,
  CURATION_CHANNEL_STATE,
  NODE_TYPES,
  NOTICE_TYPE,
  TOPIC_CHANNEL_PIN_LIMIT,
  TOPIC_CHANNEL_FEEDBACK_TYPE,
  TOPIC_CHANNEL_FEEDBACK_STATE,
  CACHE_PREFIX,
  CACHE_TTL,
  CHANNEL_ANTIFLOOD_WINDOW,
  CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW,
} from '#common/enums/index.js'
import {
  EntityNotFoundError,
  ActionLimitExceededError,
  ForbiddenError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  shortHash,
  toDatetimeRangeString,
  excludeSpam as excludeSpamModifier,
  excludeRestricted as excludeRestrictedModifier,
  excludeExclusiveCampaignArticles,
} from '#common/utils/index.js'
import {
  ArticleService,
  AtomService,
  CacheService,
  ChannelClassifier,
  NotificationService,
} from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'

const logger = getLogger('service-channel')

export class ChannelService {
  private connections: Connections
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.models = new AtomService(connections)
  }

  public createTopicChannel = async ({
    name,
    note,
    providerId,
    enabled,
  }: {
    name: string
    providerId: string
    enabled: boolean
    note?: string
  }) => {
    return this.models.create({
      table: 'topic_channel',
      data: { shortHash: shortHash(), name, note, providerId, enabled },
    })
  }

  public updateTopicChannel = async ({
    id,
    name,
    note,
    enabled,
  }: {
    id: string
    name?: string
    note?: string
    enabled?: boolean
  }) => {
    return this.models.update({
      table: 'topic_channel',
      where: { id },
      data: { name, note, enabled },
    })
  }

  public updateOrCreateCampaignChannel = async ({
    campaignId,
    enabled,
  }: Pick<CampaignChannel, 'campaignId' | 'enabled'>) => {
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
      await this.models.update({
        table: 'article',
        where: { id: articleId },
        data: { isSpam: false },
      })
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
      datetimeRange,
      addOrderColumn = false,
      // false to exclude flood articles, true to query flood articles.
      flood,
    }: {
      channelThreshold?: number
      spamThreshold?: number
      datetimeRange?: { start: Date; end?: Date }
      flood?: boolean
      addOrderColumn?: boolean
    } = {
      addOrderColumn: false,
    }
  ) => {
    const knexRO = this.connections.knexRO
    const pinnedQuery = knexRO
      .select(
        'article.*',
        'topic_channel_article.created_at as channel_article_created_at'
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
        'topic_channel_article.created_at as channel_article_created_at'
      )
      .from('topic_channel_article')
      .leftJoin('article', 'topic_channel_article.article_id', 'article.id')
      .where({
        'topic_channel_article.channel_id': channelId,
        'topic_channel_article.enabled': true,
        'topic_channel_article.pinned': false,
        'article.state': ARTICLE_STATE.active,
      })
      .modify(excludeRestrictedModifier)
      .modify(excludeExclusiveCampaignArticles)
      .where((builder) => {
        if (channelThreshold) {
          builder.where((qb) => {
            qb.where(
              'topic_channel_article.score',
              '>=',
              channelThreshold
            ).orWhere('topic_channel_article.is_labeled', true)
          })
        }
      })
      .where((builder) => {
        if (spamThreshold) {
          builder.modify(excludeSpamModifier, spamThreshold)
        }
      })

    if (addOrderColumn) {
      pinnedQuery.select(
        knexRO.raw(
          'RANK() OVER (ORDER BY topic_channel_article.pinned_at DESC) AS order'
        )
      )
      unpinnedQuery.select(
        knexRO.raw(
          'RANK() OVER (ORDER BY topic_channel_article.created_at DESC) + 100 AS order'
        )
      )
    }

    const query = pinnedQuery.union(unpinnedQuery)

    if (datetimeRange) {
      const alias = 'find_topic_channel_articles_alias'
      const filteredQuery = knexRO(query.as(alias)).where(
        `${alias}.created_at`,
        '>=',
        datetimeRange.start
      )
      if (datetimeRange.end) {
        filteredQuery.where(`${alias}.created_at`, '<=', datetimeRange.end)
      }
      return filteredQuery
    }

    if (flood !== undefined) {
      const floodBaseQuery = knexRO
        .with('base', query)
        .with(
          'time_grouped',
          knexRO.raw(
            `SELECT *,
              ((extract(epoch FROM created_at - first_value(created_at) OVER (PARTITION BY author_id ORDER BY created_at))/3600)::integer)/${CHANNEL_ANTIFLOOD_WINDOW} AS time_group
            FROM base`
          )
        )
        .with(
          'ranked',
          knexRO.raw(
            `SELECT *,
              row_number() OVER (PARTITION BY author_id, time_group ORDER BY created_at ASC) as rank
            FROM time_grouped`
          )
        )
        .select('*')
        .from('ranked')
      if (flood === true) {
        return floodBaseQuery.where(
          'rank',
          '>',
          CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW
        )
      } else {
        return floodBaseQuery.where(
          'rank',
          '<=',
          CHANNEL_ANTIFLOOD_LIMIT_PER_WINDOW
        )
      }
    }

    return query
  }

  public isFlood = async ({
    articleId,
    channelId,
  }: {
    articleId: string
    channelId: string
  }) => {
    const cacheService = new CacheService(
      CACHE_PREFIX.CHANNEL_FLOOD,
      this.connections.objectCacheRedis
    )
    const articleIds = await cacheService.getObject({
      keys: {
        type: 'channelFlood',
        args: { channelId },
      },
      getter: async () => {
        const articles = await this.findTopicChannelArticles(channelId, {
          flood: true,
        })
        return articles.map((a) => a.id)
      },
      expire: CACHE_TTL.MEDIUM,
    })
    return articleIds.includes(articleId)
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
  public findCurationChannelArticles = (
    channelId: string,
    { addOrderColumn }: { addOrderColumn: boolean } = { addOrderColumn: false }
  ) => {
    const knexRO = this.connections.knexRO
    const pinnedQuery = knexRO('article')
      .select('article.*')
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

    const unpinnedQuery = knexRO('article')
      .select('article.*')
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

    if (addOrderColumn) {
      pinnedQuery.select(
        knexRO.raw(
          'RANK() OVER (ORDER BY curation_channel_article.pinned_at DESC) AS order'
        )
      )
      unpinnedQuery.select(
        knexRO.raw(
          'RANK() OVER (ORDER BY curation_channel_article.created_at DESC) + 100 AS order'
        )
      )
    }

    return pinnedQuery.union(unpinnedQuery)
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
      if (articleIds.length > maxPinAmount) {
        throw new ActionLimitExceededError(
          `Cannot pin more than ${maxPinAmount} articles in this channel`
        )
      }
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
        // Find oldest pinned articles to unpin
        const oldestPinnedArticles = await this.models.findMany({
          table:
            channelType === NODE_TYPES.TopicChannel
              ? 'topic_channel_article'
              : 'curation_channel_article',
          where: { channelId, pinned: true },
          orderBy: [{ column: 'pinned_at', order: 'asc' }],
          take: unpinnedArticleCount - (maxPinAmount - currentPinnedCount),
        })

        // Unpin oldest articles to make room
        await this.models.updateMany({
          table:
            channelType === NODE_TYPES.TopicChannel
              ? 'topic_channel_article'
              : 'curation_channel_article',
          where: { channelId },
          whereIn: ['articleId', oldestPinnedArticles.map((a) => a.articleId)],
          data: {
            pinned: false,
            pinnedAt: null,
          },
        })
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

  public createPositiveFeedback = async ({
    articleId,
    userId,
  }: {
    articleId: string
    userId: string
  }) => {
    const article = await this.models.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    if (article?.authorId !== userId) {
      throw new ForbiddenError('Only author can submit feedbacks')
    }

    const feedback = await this.models.findFirst({
      table: 'topic_channel_feedback',
      where: { articleId },
    })
    if (feedback) {
      throw new ActionLimitExceededError('Feedback already exists')
    }

    return this.models.create({
      table: 'topic_channel_feedback',
      data: {
        type: TOPIC_CHANNEL_FEEDBACK_TYPE.POSITIVE,
        articleId,
        userId,
      },
    })
  }

  public createNegativeFeedback = async ({
    articleId,
    userId,
    channelIds,
  }: {
    articleId: string
    userId: string
    channelIds: string[]
  }) => {
    const article = await this.models.findUnique({
      table: 'article',
      where: { id: articleId },
    })
    if (article?.authorId !== userId) {
      throw new ForbiddenError('Only author can submit feedbacks')
    }

    const existingFeedback = await this.models.findFirst({
      table: 'topic_channel_feedback',
      where: { articleId },
    })
    if (existingFeedback) {
      throw new ActionLimitExceededError('Feedback already exists')
    }

    const feedback = await this.models.create({
      table: 'topic_channel_feedback',
      data: {
        type: TOPIC_CHANNEL_FEEDBACK_TYPE.NEGATIVE,
        articleId,
        userId,
        channelIds: JSON.stringify(channelIds) as unknown as string[],
        state: TOPIC_CHANNEL_FEEDBACK_STATE.PENDING,
      },
    })

    // auto accept feedback if it is remove all channels or in line with current classification
    if (
      feedback.channelIds.length === 0 ||
      (await this.isFeedbackResolved({
        articleId,
        channelIds: feedback.channelIds,
      }))
    ) {
      await this.acceptFeedback(feedback, true)
      return await this.models.update({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
        data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED },
      })
    }
    return feedback
  }

  public findFeedbacks = ({
    type,
    state,
    spamThreshold,
  }: {
    type?: ValueOf<typeof TOPIC_CHANNEL_FEEDBACK_TYPE>
    state?: ValueOf<typeof TOPIC_CHANNEL_FEEDBACK_STATE>
    spamThreshold?: number | null
  } = {}) => {
    const knexRO = this.connections.knexRO
    const query = knexRO('topic_channel_feedback').select(
      'topic_channel_feedback.*'
    )
    if (type !== undefined) {
      query.where({ 'topic_channel_feedback.type': type })
    }
    if (state !== undefined) {
      query.where({ 'topic_channel_feedback.state': state })
    }
    if (spamThreshold) {
      query
        .leftJoin('article', 'topic_channel_feedback.article_id', 'article.id')
        .modify(excludeSpamModifier, spamThreshold)
        .modify(excludeRestrictedModifier)
    }
    return query
  }

  public acceptFeedback = async (
    feedback: TopicChannelFeedback,
    autoResolve: boolean = false
  ) => {
    const notificationService = new NotificationService(this.connections)
    // will not set isLabeled to true if autoResolve is true
    if (feedback.channelIds.length === 0 && autoResolve) {
      await this.models.updateMany({
        table: 'topic_channel_article',
        where: { articleId: feedback.articleId },
        data: { enabled: false },
      })
      const autoResolved = await this.models.update({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
        data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED },
      })
      await invalidateFQC({
        node: { type: NODE_TYPES.Article, id: autoResolved.articleId },
        redis: this.connections.redis,
      })
      notificationService.trigger({
        event: NOTICE_TYPE.topic_channel_feedback_accepted,
        recipientId: feedback.userId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: await this.models.articleIdLoader.load(feedback.articleId),
          },
        ],
      })
      return autoResolved
    }
    if (
      await this.isFeedbackResolved({
        articleId: feedback.articleId,
        channelIds: feedback.channelIds,
      })
    ) {
      const resolved = await this.models.update({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
        data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED },
      })
      await invalidateFQC({
        node: { type: NODE_TYPES.Article, id: resolved.articleId },
        redis: this.connections.redis,
      })
      notificationService.trigger({
        event: NOTICE_TYPE.topic_channel_feedback_accepted,
        recipientId: feedback.userId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: await this.models.articleIdLoader.load(feedback.articleId),
          },
        ],
      })
      return resolved
    }

    await this.setArticleTopicChannels({
      articleId: feedback.articleId,
      channelIds: feedback.channelIds,
    })
    const updated = await this.models.update({
      table: 'topic_channel_feedback',
      where: { id: feedback.id },
      data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.ACCEPTED },
    })
    await invalidateFQC({
      node: { type: NODE_TYPES.Article, id: updated.articleId },
      redis: this.connections.redis,
    })
    notificationService.trigger({
      event: NOTICE_TYPE.topic_channel_feedback_accepted,
      recipientId: feedback.userId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: await this.models.articleIdLoader.load(feedback.articleId),
        },
      ],
    })
    return updated
  }

  public rejectFeedback = async (feedback: TopicChannelFeedback) => {
    return this.models.update({
      table: 'topic_channel_feedback',
      where: { id: feedback.id },
      data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.REJECTED },
    })
  }

  public resolveArticleFeedback = async (articleId: string) => {
    const feedback = await this.models.findFirst({
      table: 'topic_channel_feedback',
      where: { articleId },
    })
    if (
      feedback &&
      feedback.state === TOPIC_CHANNEL_FEEDBACK_STATE.PENDING &&
      (await this.isFeedbackResolved({
        articleId,
        channelIds: feedback.channelIds,
      }))
    ) {
      const autoResolved = await this.models.update({
        table: 'topic_channel_feedback',
        where: { id: feedback.id },
        data: { state: TOPIC_CHANNEL_FEEDBACK_STATE.RESOLVED },
      })
      await invalidateFQC({
        node: { type: NODE_TYPES.Article, id: autoResolved.articleId },
        redis: this.connections.redis,
      })
      const notificationService = new NotificationService(this.connections)
      notificationService.trigger({
        event: NOTICE_TYPE.topic_channel_feedback_accepted,
        recipientId: feedback.userId,
        entities: [
          {
            type: 'target',
            entityTable: 'article',
            entity: await this.models.articleIdLoader.load(feedback.articleId),
          },
        ],
      })
    }
  }

  public isFeedbackResolved = async ({
    articleId,
    channelIds,
  }: {
    articleId: string
    channelIds: string[]
  }) => {
    const articleChannels = await this.models.findMany({
      table: 'topic_channel_article',
      where: { articleId, enabled: true },
    })
    const currentChannelIds = articleChannels.map((c) => c.channelId)
    if (channelIds.every((id) => currentChannelIds.includes(id))) {
      return true
    }
    if (channelIds.length === 0 && articleChannels.length === 0) {
      return true
    }
    return false
  }
}

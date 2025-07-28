import type { Connections, Article } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
  RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY,
  RECOMMENDATION_DECAY_DAYS,
  RECOMMENDATION_DECAY_DAYS_CHANNEL_AUTHOR,
  RECOMMENDATION_DECAY_DAYS_CHANNEL_TAG,
  RECOMMENDATION_DECAY_FACTOR,
  RECOMMENDATION_TOP_PERCENTILE,
  RECOMMENDATION_TOP_PERCENTILE_CHANNEL_AUTHOR,
  RECOMMENDATION_TOP_PERCENTILE_CHANNEL_TAG,
  RECOMMENDATION_HOTTEST_MAX_TAKE,
  USER_RESTRICTION_TYPE,
  USER_STATE,
  USER_ACTION,
} from '#common/enums/index.js'
import {
  UserInputError,
  EntityNotFoundError,
  ActionFailedError,
} from '#common/errors.js'
import { daysToDatetimeRange } from '#common/utils/time.js'
import { quantile, median } from 'd3-array'
import keyBy from 'lodash/keyBy.js'

import { ArticleService } from './article/articleService.js'
import { AtomService } from './atomService.js'
import { ChannelService } from './channel/channelService.js'
import { CommentService } from './commentService.js'
import { SystemService } from './systemService.js'
import { UserService } from './userService.js'

export class RecommendationService {
  private connections: Connections
  private models: AtomService
  private articleService: ArticleService
  private channelService: ChannelService
  private commentService: CommentService
  private systemService: SystemService
  private userService: UserService
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.connections = connections
    this.knexRO = connections.knexRO
    this.models = new AtomService(this.connections)
    this.articleService = new ArticleService(this.connections)
    this.channelService = new ChannelService(this.connections)
    this.commentService = new CommentService(this.connections)
    this.userService = new UserService(this.connections)
    this.systemService = new SystemService(this.connections)
  }

  /**
   * Query for hottest articles
   *
   * @see https://observablehq.com/d/2e388b5a7f4c217a
   */
  public findHottestArticles = async ({
    days = 5,
    decayDays = 3,
    HKDThreshold = 1,
    USDTThreshold = 0.1,
    readWeight = 0.3,
    commentWeight = 0.4,
    donationWeight = 0.3,
    readersThreshold = 5,
    commentsThreshold = 3,
    normalizeCutFactor = 0.95,
    normalizeDecayFactor = 0.15,
    normalizeEpsilonFactor = 0.5,
  }): Promise<Array<{ articleId: string }>> => {
    const { query } = await this._findHottestArticles({
      days,
      decayDays,
      HKDThreshold,
      USDTThreshold,
      readWeight,
      commentWeight,
      donationWeight,
      readersThreshold,
      commentsThreshold,
    })
    const results = await query

    // Get unique author IDs from results
    const authorIds = [...new Set(results.map((r) => r.authorId))]

    // Fetch follower counts for all authors
    const followerCounts = await this.countUsersFollowers(authorIds)

    // Prepare data for normalization
    const userFollowers = authorIds.map((authorId) => ({
      authorId,
      followers: followerCounts[authorId] || 0,
    }))

    // Prepare comparison data
    const sorted = userFollowers.map((d) => d.followers).sort((a, b) => a - b)
    const medianFollowers = median(sorted) || 0
    const cut = quantile(sorted, normalizeCutFactor) || 0
    const epsilon = medianFollowers * normalizeEpsilonFactor

    // Create follower map for quick lookup
    const followerMap = keyBy(userFollowers, 'authorId')

    // Apply normalization to results
    const normalizedResults = results.map((result) => {
      const followerData = followerMap[result.authorId]
      const followers = followerData ? followerData.followers : 0
      const f = Math.min(followers, cut)
      const rawFactor =
        ((medianFollowers * epsilon) / (f + epsilon)) ** normalizeDecayFactor
      const factor = Math.min(rawFactor, 1)

      return {
        ...result,
        newScore: result.score * factor,
      }
    })

    // Sort by normalized score and return
    return normalizedResults
      .sort((a, b) => b.newScore - a.newScore)
      .slice(0, RECOMMENDATION_HOTTEST_MAX_TAKE)
      .map((r) => ({ articleId: r.articleId }))
  }

  private _findHottestArticles = async ({
    days,
    decayDays,
    HKDThreshold,
    USDTThreshold,
    readWeight,
    commentWeight,
    donationWeight,
    readersThreshold,
    commentsThreshold,
  }: {
    days: number
    decayDays: number
    HKDThreshold: number
    USDTThreshold: number
    readWeight: number
    commentWeight: number
    donationWeight: number
    readersThreshold: number
    commentsThreshold: number
  }) => {
    const { id: targetTypeId } = await this.systemService.baseFindEntityTypeId(
      'article'
    )
    const spamThreshold = await this.systemService.getSpamThreshold()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const query = this.knexRO
      .with('hottest_source', (qb) => {
        return qb
          .from(
            this.articleService
              .findArticles({
                state: ARTICLE_STATE.active,
                spam: {
                  isSpam: false,
                  spamThreshold: spamThreshold ?? 0,
                },
                excludeAuthorStates: [USER_STATE.frozen, USER_STATE.archived],
                excludeRestrictedAuthors: USER_RESTRICTION_TYPE.articleHottest,
                excludeExclusiveCampaignArticles: true,
                excludeComplaintAreaArticles: true,
                datetimeRange: {
                  start: startDate,
                },
              })
              .as('t')
          )
          .select(['id as article_id', 'author_id'])
      })
      .with('base', (qb) => {
        const readersQuery = this.knexRO
          .select(
            'article_id',
            this.knexRO.raw('count(DISTINCT user_id)::int AS readers'),
            this.knexRO.raw('sum(score) AS read_score')
          )
          .from(
            this.knexRO
              .select(
                'article_id',
                'user_id',
                this.knexRO.raw(
                  'CASE WHEN user_id IS NULL THEN greatest(1 - (extract(epoch FROM now() - updated_at) / (24 * 3600)) / ?, 0) ELSE greatest(1 - (extract(epoch FROM now() - created_at) / (24 * 3600)) / ?, 0) END AS score',
                  [decayDays, decayDays]
                )
              )
              .from('article_read_count')
              .where('updated_at', '>=', startDate)
              .as('t1_source')
          )
          .groupBy('article_id')
        const commentsQuery = this.knexRO
          .select(
            'target_id',
            this.knexRO.raw('count(id)::int AS comments'),
            this.knexRO.raw('sum(score) AS comment_score')
          )
          .from(
            this.knexRO
              .select(
                'comment.id',
                'comment.target_id',
                this.knexRO.raw(
                  'greatest(1 - (extract(epoch from now() - comment.created_at) / (24 * 3600)) / ?, 0) AS score',
                  [decayDays]
                )
              )
              .from('comment')
              .innerJoin('article', 'article.id', 'comment.target_id')
              .where('comment.state', 'active')
              .where('comment.target_type_id', targetTypeId)
              .where(
                'comment.author_id',
                '!=',
                this.knexRO.ref('article.author_id')
              )
              .where('comment.created_at', '>=', startDate)
              .as('t2_source')
          )
          .groupBy('target_id')
        const donationsQuery = this.knexRO
          .select(
            'target_id',
            this.knexRO.raw('count(id)::int AS donations'),
            this.knexRO.raw('sum(score) AS donation_score')
          )
          .from(
            this.knexRO
              .select(
                'id',
                'target_id',
                this.knexRO.raw(
                  'greatest(1 - (extract(epoch from now() - created_at) / (24 * 3600)) / ?, 0) AS score',
                  [decayDays]
                )
              )
              .from('transaction')
              .where('target_type', targetTypeId)
              .where('state', 'succeeded')
              .where('purpose', 'donation')
              .where((w) => {
                return w
                  .where('currency', 'HKD')
                  .where('amount', '>=', HKDThreshold)
                  .orWhere('currency', 'USDT')
                  .where('amount', '>=', USDTThreshold)
              })
              .where('created_at', '>=', startDate)
              .as('t3_source')
          )
          .groupBy('target_id')

        return qb
          .select(
            'hottest_source.article_id',
            'hottest_source.author_id',
            this.knexRO.raw('coalesce(t1.readers, 0) AS readers'),
            this.knexRO.raw('coalesce(t1.read_score, 0) AS read_score'),
            this.knexRO.raw('coalesce(t2.comments, 0) AS comments'),
            this.knexRO.raw('coalesce(t2.comment_score, 0) AS comment_score'),
            this.knexRO.raw('coalesce(t3.donations, 0) AS donations'),
            this.knexRO.raw('coalesce(t3.donation_score, 0) AS donation_score')
          )
          .from('hottest_source')
          .leftJoin(
            readersQuery.as('t1'),
            'hottest_source.article_id',
            't1.article_id'
          )
          .leftJoin(
            commentsQuery.as('t2'),
            'hottest_source.article_id',
            't2.target_id'
          )
          .leftJoin(
            donationsQuery.as('t3'),
            'hottest_source.article_id',
            't3.target_id'
          )
      })
      .select(
        'article_id',
        'author_id',
        this.knexRO.raw(
          '(? * base.read_score + ? * base.comment_score + ? * base.donation_score) as score',
          [readWeight, commentWeight, donationWeight]
        )
      )
      .from('base')
      .where((w) => {
        return w
          .where('readers', '>=', readersThreshold)
          .orWhere('comments', '>=', commentsThreshold)
      })

    return { query }
  }

  public countUsersFollowers = async (
    userIds: string[]
  ): Promise<{
    [userId: string]: number
  }> => {
    if (userIds.length === 0) {
      return {}
    }

    const results = await this.knexRO
      .select(
        'target_id AS user_id',
        this.knexRO.raw('COUNT(distinct user_id)::int AS count')
      )
      .from('action_user')
      .whereIn('target_id', userIds)
      .where({ action: USER_ACTION.follow })
      .groupBy('target_id')

    // Convert results to the expected format
    const followerCounts: { [userId: string]: number } = {}

    // Initialize all requested userIds with 0
    userIds.forEach((userId) => {
      followerCounts[userId] = 0
    })

    // Update with actual counts
    results.forEach((result) => {
      followerCounts[result.user_id] = result.count
    })

    return followerCounts
  }

  public createIcymiTopic = async ({
    title,
    articleIds,
    pinAmount,
    note,
  }: {
    title: string
    articleIds: string[]
    pinAmount: number
    note?: string
  }) => {
    if (!MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS.includes(pinAmount)) {
      throw new UserInputError('Invalid pin amount')
    }
    const articles = await this.models.articleIdLoader.loadMany(articleIds)
    for (const article of articles) {
      if (!article || article.state !== ARTICLE_STATE.active) {
        throw new UserInputError('Invalid article')
      }
    }
    return this.models.create({
      table: 'matters_choice_topic',
      data: {
        title,
        articles: articleIds,
        pinAmount,
        note,
        state: MATTERS_CHOICE_TOPIC_STATE.editing,
      },
    })
  }

  public updateIcymiTopic = async (
    id: string,
    {
      title,
      articleIds,
      pinAmount,
      note,
    }: {
      title?: string
      articleIds?: string[]
      pinAmount?: number
      note?: string
    }
  ) => {
    if (
      pinAmount &&
      !MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS.includes(pinAmount)
    ) {
      throw new UserInputError('Invalid pin amount')
    }
    if (articleIds) {
      const articles = await this.models.articleIdLoader.loadMany(articleIds)
      for (const article of articles) {
        if (!article || article.state !== ARTICLE_STATE.active) {
          throw new UserInputError('Invalid article')
        }
      }
    }
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (!topic) {
      throw new EntityNotFoundError('Topic not found')
    }
    if (topic.state === MATTERS_CHOICE_TOPIC_STATE.archived) {
      throw new ActionFailedError('Invalid topic state')
    }
    return this.models.update({
      table: 'matters_choice_topic',
      where: { id },
      data: { title, articles: articleIds, pinAmount, note },
    })
  }

  public publishIcymiTopic = async (id: string) => {
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (!topic) {
      throw new EntityNotFoundError('Topic not found')
    }
    if (topic.state !== MATTERS_CHOICE_TOPIC_STATE.editing) {
      throw new ActionFailedError('Invalid topic state')
    }
    if (topic.articles.length < topic.pinAmount) {
      throw new ActionFailedError('Articles amount less than pinAmount')
    }
    const publisheds = await this.models.findMany({
      table: 'matters_choice_topic',
      where: { state: MATTERS_CHOICE_TOPIC_STATE.published },
    })
    await Promise.all(publisheds.map((t) => this.archiveIcymiTopic(t.id)))

    return this.models.update({
      table: 'matters_choice_topic',
      where: { id },
      data: {
        state: MATTERS_CHOICE_TOPIC_STATE.published,
        publishedAt: new Date(),
      },
    })
  }

  public archiveIcymiTopic = async (id: string) => {
    const topic = await this.models.findUnique({
      table: 'matters_choice_topic',
      where: { id },
    })
    if (topic.state === MATTERS_CHOICE_TOPIC_STATE.editing) {
      await this.models.deleteMany({
        table: 'matters_choice_topic',
        where: { id },
      })
      return null
    } else if (topic.state === MATTERS_CHOICE_TOPIC_STATE.published) {
      for (const articleId of topic.articles.reverse()) {
        await this.models.upsert({
          table: 'matters_choice',
          where: { articleId },
          create: { articleId },
          update: {},
        })
      }
      return this.models.update({
        table: 'matters_choice_topic',
        where: { id },
        data: { state: MATTERS_CHOICE_TOPIC_STATE.archived },
      })
    } else {
      throw new ActionFailedError('Invalid topic state')
    }
  }

  public findIcymiArticles = async ({
    take,
    skip,
  }: {
    take?: number
    skip?: number
  }) => {
    const MAX_ITEM_COUNT = DEFAULT_TAKE_PER_PAGE * 50
    const records = await this.knexRO
      .select(
        'article.*',
        this.knexRO.raw('COUNT(1) OVER() ::int AS total_count')
      )
      .from(
        this.knexRO
          .select()
          .from('matters_choice')
          .whereNotIn(
            'article_id',
            this.knexRO
              .select(this.knexRO.raw('UNNEST(articles)'))
              .from('matters_choice_topic')
              .where('state', MATTERS_CHOICE_TOPIC_STATE.published)
          )
          .orderBy('updated_at', 'desc')
          .limit(MAX_ITEM_COUNT)
          .as('choice')
      )
      .leftJoin('article', 'choice.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .modify((builder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return [records as Article[], records[0]?.totalCount || 0]
  }

  public calRecommendationPoolSize = async ({
    articlesQuery,
    days,
    dateColumn = 'created_at',
  }: {
    articlesQuery: Knex.QueryBuilder
    days: number
    dateColumn: string
  }) => {
    const knex = articlesQuery.client.queryBuilder()
    const { start, end } = daysToDatetimeRange(days)
    const query = knex
      .clone()
      .from(articlesQuery.clone().as('t'))
      .whereRaw(`t.?? >= ?`, [dateColumn, start])
      .whereRaw(`t.?? < ?`, [dateColumn, end])
      .count()
      .first()

    const result = await query
    const amount = result?.count || 0
    return Math.max(amount, RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * days)
  }

  //  add recommendation score column to articlesQuery and filter out new articles of today (UTC+8)
  public addRecommendationScoreColumn = async ({
    articlesQuery,
    decay,
    dateColumn = 'created_at',
  }: {
    articlesQuery: Knex.QueryBuilder
    decay: {
      days: number
      factor: number
    }
    dateColumn: string
  }) => {
    const size = await this.calRecommendationPoolSize({
      articlesQuery,
      days: decay.days,
      dateColumn,
    })
    const { end } = daysToDatetimeRange(decay.days)

    const knex = articlesQuery.client.queryBuilder()
    const baseQuery = knex
      .clone()
      .from(articlesQuery.clone().as('t'))
      .whereRaw(`t.?? < ?`, [dateColumn, end])
      .limit(size)
    const { query: withReadCount, column: readCountColumn } =
      this.articleService.addReadCountColumn(baseQuery)
    const { query: withCommentCount, column: commentCountColumn } =
      await this.commentService.addNotAuthorCommentCountColumn(withReadCount)
    const { query: withBookmarkCount, column: bookmarkCountColumn } =
      this.userService.addBookmarkCountColumn(withCommentCount)

    const decaySeconds = decay.days * 24 * 3600
    const alias = 'article_with_metrics'
    const scoreColumn = 'score'
    return {
      query: knex
        .clone()
        .from(withBookmarkCount.as(alias))
        .select(
          `${alias}.*`,
          knex.client.raw(
            '(0.4 * ?? + 0.4 * ?? + 0.2 * ?? ) * (1 - least(?, ? * (EXTRACT(EPOCH FROM now()-??.??) / ?))) AS ??',
            [
              readCountColumn,
              commentCountColumn,
              bookmarkCountColumn,
              decay.factor,
              decay.factor,
              alias,
              dateColumn,
              decaySeconds,
              scoreColumn,
            ]
          )
        ),
      column: scoreColumn,
      size,
    }
  }

  public recommendAuthors = async (
    channelId?: string
  ): Promise<{
    query: Knex.QueryBuilder<any, Array<{ authorId: string }>>
  }> => {
    const decayDays = channelId
      ? RECOMMENDATION_DECAY_DAYS_CHANNEL_AUTHOR
      : RECOMMENDATION_DECAY_DAYS
    const percentile = channelId
      ? RECOMMENDATION_TOP_PERCENTILE_CHANNEL_AUTHOR
      : RECOMMENDATION_TOP_PERCENTILE
    const decayFactor = RECOMMENDATION_DECAY_FACTOR
    const spamThreshold = await this.systemService.getSpamThreshold()
    const dateColumn = channelId ? 'channel_article_created_at' : 'created_at'
    let articlesQuery
    if (channelId) {
      const { query: baseQuery } =
        await this.channelService.findTopicChannelArticles(channelId, {
          channelThreshold: undefined,
          addOrderColumn: true,
        })
      articlesQuery = baseQuery.orderBy('order', 'asc')
    } else {
      articlesQuery = this.articleService.findNewestArticles({
        excludeChannelArticles: false,
        spamThreshold: spamThreshold ?? undefined,
      })
    }

    const { query: scoreQuery, column: articleScoreColumn } =
      await this.addRecommendationScoreColumn({
        articlesQuery,
        decay: { days: decayDays, factor: decayFactor },
        dateColumn,
      })
    const knex = articlesQuery.client.queryBuilder()
    const query = knex
      .with('with_author_score', (qb) => {
        return qb
          .from(scoreQuery.as('t'))
          .groupBy('author_id')
          .select(
            'author_id',
            knex.client.raw('avg(??) as author_score', [articleScoreColumn])
          )
      })
      .with('author_percentile_score', (qb) => {
        return qb
          .from('with_author_score')
          .select(
            knex.client.raw(
              'percentile_cont(??) WITHIN GROUP (ORDER BY author_score DESC) as percentile_score',
              [percentile]
            )
          )
          .limit(1)
      })
      .with('with_article_count', (qb) => {
        const { query: withArticleCount } =
          this.articleService.addArticleCountColumn(
            qb.from('with_author_score'),
            {
              joinColumn: 'author_id',
            }
          )
        return qb.from(withArticleCount.as('t'))
      })
      .from('with_article_count')
      .crossJoin(
        knex.client.raw(
          '(SELECT percentile_score FROM author_percentile_score LIMIT 1) AS percentile_score_table'
        )
      )
      .whereRaw(`article_count > 1`)
      .whereRaw(`author_score > percentile_score`)
      .select('with_article_count.author_id')

    return { query }
  }

  public recommendTags = async (
    channelId?: string
  ): Promise<{ query: Knex.QueryBuilder<any, Array<{ tagId: string }>> }> => {
    const decayDays = channelId
      ? RECOMMENDATION_DECAY_DAYS_CHANNEL_TAG
      : RECOMMENDATION_DECAY_DAYS
    const percentile = RECOMMENDATION_TOP_PERCENTILE_CHANNEL_TAG
    const decayFactor = RECOMMENDATION_DECAY_FACTOR
    const spamThreshold = await this.systemService.getSpamThreshold()
    const dateColumn = channelId ? 'channel_article_created_at' : 'created_at'
    let articlesQuery
    if (channelId) {
      const { query: baseQuery } =
        await this.channelService.findTopicChannelArticles(channelId, {
          channelThreshold: undefined,
          addOrderColumn: true,
        })
      articlesQuery = baseQuery.orderBy('order', 'asc')
    } else {
      articlesQuery = this.articleService.findNewestArticles({
        excludeChannelArticles: false,
        spamThreshold: spamThreshold ?? undefined,
      })
    }

    const { query: scoreQuery, column: articleScoreColumn } =
      await this.addRecommendationScoreColumn({
        articlesQuery,
        decay: { days: decayDays, factor: decayFactor },
        dateColumn,
      })
    const knex = articlesQuery.client.queryBuilder()
    const query = knex
      .with('with_article_score', (qb) => {
        return qb
          .from(scoreQuery.as('t'))
          .select('id as article_id', articleScoreColumn)
      })
      .with('article_median_score', (qb) => {
        return qb
          .from('with_article_score')
          .select(
            knex.client.raw(
              'percentile_cont(0.5) WITHIN GROUP (ORDER BY ?? DESC) as median_score',
              [articleScoreColumn]
            )
          )
          .limit(1)
      })
      .with('article_top_percentile', (qb) => {
        return qb
          .from('with_article_score')
          .crossJoin(
            knex.client.raw(
              '(SELECT median_score FROM article_median_score LIMIT 1) AS median_score_table'
            )
          )
          .whereRaw('?? > median_score', [articleScoreColumn])
          .select('article_id')
      })
      .with('tags', (qb) => {
        return qb
          .from('article_tag')
          .whereIn(
            'article_id',
            knex.client.raw('select article_id from article_top_percentile')
          )
          .distinct('tag_id')
      })
      .with('with_author_avg_count', (qb) => {
        return qb
          .from(
            qb
              .clone()
              .from('article_tag')
              .join('article', 'article_tag.article_id', 'article.id')
              .whereRaw("article_tag.created_at > now() - interval '3 months'")
              .groupBy(
                'tag_id',
                knex.client.raw("date_trunc('month', article_tag.created_at)")
              )
              .select(
                'tag_id',
                knex.client.raw('count(distinct author_id) as count')
              )
              .as('at')
          )
          .join('tags', 'at.tag_id', 'tags.tag_id')
          .groupBy('tags.tag_id')
          .select('tags.tag_id', knex.client.raw('avg(at.count) as count'))
      })
      .with('percentile_author_count', (qb) => {
        return qb
          .from('with_author_avg_count')
          .select(
            knex.client.raw(
              'percentile_cont(??) WITHIN GROUP (ORDER BY count DESC) as percentile_count',
              [percentile]
            )
          )
          .limit(1)
      })
      .from('with_author_avg_count')
      .crossJoin(
        knex.client.raw(
          '(SELECT percentile_count FROM percentile_author_count LIMIT 1) AS percentile_count_table'
        )
      )
      .whereRaw('count > percentile_count')
      .select('tag_id')

    return { query }
  }
}

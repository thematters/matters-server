import type { Connections, Article } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  MATTERS_CHOICE_TOPIC_STATE,
  MATTERS_CHOICE_TOPIC_VALID_PIN_AMOUNTS,
  ARTICLE_STATE,
  DEFAULT_TAKE_PER_PAGE,
  RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY,
  RECOMMENDATION_DECAY_DAYS,
  RECOMMENDATION_DECAY_DAYS_CHANNEL,
  RECOMMENDATION_DECAY_FACTOR,
  RECOMMENDATION_TOP_PERCENTILE,
  RECOMMENDATION_TOP_PERCENTILE_CHANNEL,
} from '#common/enums/index.js'
import {
  UserInputError,
  EntityNotFoundError,
  ActionFailedError,
} from '#common/errors.js'

import { ArticleService } from './articleService.js'
import { AtomService } from './atomService.js'
import { ChannelService } from './channelService.js'
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
    const query = knex
      .from(articlesQuery.clone().as('t'))
      .whereRaw(`t.${dateColumn} >= (NOW() - INTERVAL '?? DAYS')`, [days])
      .count()
      .first()

    const result = await query
    const amount = result?.count || 0
    return Math.max(amount, RECOMMENDATION_ARTICLE_AMOUNT_PER_DAY * days)
  }

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

    const baseQuery = articlesQuery.clone().limit(size)
    const { query: withReadCount, column: readCountColumn } =
      this.articleService.addReadCountColumn(baseQuery)
    const { query: withCommentCount, column: commentCountColumn } =
      await this.commentService.addNotAuthorCommentCountColumn(withReadCount)
    const { query: withBookmarkCount, column: bookmarkCountColumn } =
      this.userService.addBookmarkCountColumn(withCommentCount)

    const knex = articlesQuery.client.queryBuilder()

    const decaySeconds = decay.days * 24 * 3600
    const alias = 'article_with_metrics'
    const scoreColumn = 'score'
    return {
      query: knex
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
  ): Promise<Array<{ authorId: string }>> => {
    // site recommendation
    const decayDays = channelId
      ? RECOMMENDATION_DECAY_DAYS_CHANNEL
      : RECOMMENDATION_DECAY_DAYS
    const percentile = channelId
      ? RECOMMENDATION_TOP_PERCENTILE_CHANNEL
      : RECOMMENDATION_TOP_PERCENTILE
    const decayFactor = RECOMMENDATION_DECAY_FACTOR
    const spamThreshold = await this.systemService.getSpamThreshold()
    const dateColumn = channelId ? 'channel_article_created_at' : 'created_at'
    const articlesQuery = channelId
      ? this.channelService
          .findTopicChannelArticles(channelId, {
            channelThreshold: undefined,
            spamThreshold: spamThreshold ?? undefined,
            addOrderColumn: true,
          })
          .orderBy('order', 'asc')
      : this.articleService.latestArticles({
          excludeChannelArticles: false,
          spamThreshold: spamThreshold ?? undefined,
        })

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
      .with('author_median_score', (qb) => {
        return qb
          .from('with_author_score')
          .select(
            knex.client.raw(
              'percentile_cont(??) WITHIN GROUP (ORDER BY author_score DESC) as median_score',
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
          '(SELECT median_score FROM author_median_score LIMIT 1) AS median_score_table'
        )
      )
      .whereRaw(`article_count > 1`)
      .whereRaw(`author_score > median_score`)
      .select('with_article_count.author_id')

    return query
  }
}

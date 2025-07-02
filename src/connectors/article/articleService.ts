import type {
  Connections,
  Article,
  ArticleVersion,
  ArticleBoost,
  LANGUAGES,
  ValueOf,
  GQLTranslationModel,
  GQLArticleTranslation,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  APPRECIATION_PURPOSE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  CIRCLE_STATE,
  COMMENT_TYPE,
  COMMENT_STATE,
  MINUTE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  MAX_PINNED_WORKS_LIMIT,
  NODE_TYPES,
  LANGUAGE,
} from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  ActionLimitExceededError,
  InvalidCursorError,
  EntityNotFoundError,
} from '#common/errors.js'
import {
  excludeSpam as excludeSpamModifier,
  excludeRestricted as excludeRestrictedModifier,
  excludeExclusiveCampaignArticles as excludeExclusiveCampaignArticlesModifier,
} from '#common/utils/index.js'
import DataLoader from 'dataloader'
import { simplecc } from 'simplecc-wasm'
import { v4 } from 'uuid'

import { BaseService } from '../baseService.js'
import { NotificationService } from '../notification/notificationService.js'
import { OpenRouter } from '../openRouter/index.js'
import { PaymentService } from '../paymentService.js'
import { SearchService } from '../searchService.js'
import { UserWorkService } from '../userWorkService.js'

export class ArticleService extends BaseService<Article> {
  public latestArticleVersionLoader: DataLoader<string, ArticleVersion>
  private openRouter = new OpenRouter()
  private searchService: SearchService

  public constructor(connections: Connections) {
    super('article', connections)

    const batchFn = async (
      keys: readonly string[]
    ): Promise<ArticleVersion[]> => {
      const table = 'article_version_newest'
      const records = await this.knexRO<ArticleVersion>(table).whereIn(
        'article_id',
        keys
      )

      if (records.findIndex((item: unknown) => !item) >= 0) {
        throw new EntityNotFoundError(`Cannot find entity from ${table}`)
      }
      // fix order based on keys
      return keys.map(
        (key) => records.find((r) => r.articleId === key) as ArticleVersion
      )
    }

    this.latestArticleVersionLoader = new DataLoader(batchFn)
    this.searchService = new SearchService(this.connections)
  }

  /*********************************
   *                               *
   *          Article Query        *
   *                               *
   *********************************/

  public findArticles = (
    {
      state = ARTICLE_STATE.active,
      spam,
      datetimeRange,
    }: {
      state?: ValueOf<typeof ARTICLE_STATE>
      spam?: {
        isSpam: boolean
        spamThreshold: number
      }
      datetimeRange?: { start: Date; end?: Date }
    } = { state: ARTICLE_STATE.active }
  ) => {
    const query = this.knexRO('article').select('*')

    if (state) {
      query.where('state', '=', state)
    }

    if (spam?.isSpam === true) {
      query.where((builder) => {
        builder.where('is_spam', '=', true).orWhere((orWhereBuilder) => {
          orWhereBuilder
            .whereRaw('spam_score >= ?', [spam.spamThreshold])
            .whereNull('is_spam')
        })
      })
    } else if (spam?.isSpam === false) {
      query.where((builder) => {
        builder.modify(excludeSpamModifier, spam.spamThreshold, 'article')
      })
    }

    if (datetimeRange) {
      query.where('created_at', '>=', datetimeRange.start)
      if (datetimeRange.end) {
        query.where('created_at', '<=', datetimeRange.end)
      }
    }
    return query
  }

  public findArticleByShortHash = async (hash: string) =>
    this.models.findFirst({ table: 'article', where: { shortHash: hash } })

  public findByAuthor = async (
    authorId: string,
    {
      columns = ['*'],
      orderBy = 'newest',
      state = 'active',
      skip,
      take,
    }: {
      columns?: string[]
      state?: keyof typeof ARTICLE_STATE | null
      orderBy?:
        | 'newest'
        | 'mostReaders'
        | 'mostAppreciations'
        | 'mostComments'
        | 'mostDonations'
      skip?: number
      take?: number
    } = {}
  ): Promise<Article[]> => {
    const { id: targetTypeId } = await this.baseFindEntityTypeId('article')
    return this.knexRO(
      this.knexRO
        .from(this.table)
        .where({
          authorId,
        })
        .whereNotIn('state', [ARTICLE_STATE.pending, ARTICLE_STATE.error])
        .as('t1')
    )
      .modify((builder: Knex.QueryBuilder) => {
        if (state) {
          builder.andWhere({ 't1.state': state })
        }

        switch (orderBy) {
          case 'newest': {
            builder.orderBy('t1.id', 'desc')
            break
          }
          case 'mostReaders': {
            builder
              .leftJoin(
                this.knexRO('article_ga4_data')
                  .groupBy('article_id')
                  .select(
                    'article_id',
                    this.knex.raw('SUM(total_users) as reader_amount')
                  )
                  .as('t2'),
                't1.id',
                't2.article_id'
              )
              .orderBy([
                { column: 't2.reader_amount', order: 'desc', nulls: 'last' },
                { column: 't1.id', order: 'desc' },
              ])
            break
          }
          case 'mostAppreciations': {
            builder
              .leftJoin(
                this.knexRO('appreciation')
                  .whereIn('purpose', [
                    APPRECIATION_PURPOSE.appreciate,
                    APPRECIATION_PURPOSE.appreciateSubsidy,
                  ])
                  .groupBy('reference_id')
                  .select(
                    'reference_id',
                    this.knex.raw('SUM(amount) as appreciation_amount')
                  )
                  .as('t2'),
                't1.id',
                't2.reference_id'
              )
              .orderBy([
                {
                  column: 't2.appreciation_amount',
                  order: 'desc',
                  nulls: 'last',
                },
                { column: 't1.id', order: 'desc' },
              ])
            break
          }
          case 'mostComments': {
            builder
              .leftJoin(
                this.knexRO('comment')
                  .where({
                    type: COMMENT_TYPE.article,
                    state: COMMENT_STATE.active,
                    targetTypeId,
                  })
                  .groupBy('target_id')
                  .select(
                    'target_id',
                    this.knex.raw('COUNT(1) as comment_count')
                  )
                  .as('t2'),
                't1.id',
                't2.target_id'
              )
              .orderBy([
                {
                  column: 't2.comment_count',
                  order: 'desc',
                  nulls: 'last',
                },
                { column: 't1.id', order: 'desc' },
              ])
            break
          }
          case 'mostDonations': {
            builder
              .leftJoin(
                this.knexRO('transaction')
                  .where({
                    purpose: TRANSACTION_PURPOSE.donation,
                    state: TRANSACTION_STATE.succeeded,
                    targetType: targetTypeId,
                  })
                  .groupBy('target_id')
                  .select(
                    'target_id',
                    this.knex.raw('COUNT(DISTINCT sender_id) as donation_count')
                  )
                  .as('t2'),
                't1.id',
                't2.target_id'
              )
              .orderBy([
                {
                  column: 't2.donation_count',
                  order: 'desc',
                  nulls: 'last',
                },
                { column: 't1.id', order: 'desc' },
              ])
            break
          }
        }

        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })
      .select(columns)
  }

  public findByCommentedAuthor = async ({
    id,
    skip,
    take,
  }: {
    id: string
    skip?: number
    take?: number
  }): Promise<Article[]> =>
    this.knex
      .select('article.*')
      .max('comment.id', { as: '_comment_id_' })
      .from('comment')
      .innerJoin(this.table, 'comment.target_id', 'article.id')
      .where({
        'comment.author_id': id,
        'comment.type': COMMENT_TYPE.article,
      })
      .groupBy('article.id')
      .orderBy('_comment_id_', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  public latestArticles = ({
    spamThreshold,
    excludeChannelArticles,
    excludeExclusiveCampaignArticles,
  }: {
    spamThreshold?: number
    excludeChannelArticles?: boolean
    excludeExclusiveCampaignArticles?: boolean
  } = {}): Knex.QueryBuilder<Article, Article[]> =>
    this.knexRO
      .select('article_set.*')
      .from(
        this.knexRO
          .select('article.*')
          .from('article')
          .where({ 'article.state': ARTICLE_STATE.active })
          .modify(excludeRestrictedModifier)
          .modify((builder) => {
            if (excludeExclusiveCampaignArticles) {
              builder.modify(excludeExclusiveCampaignArticlesModifier)
            }
            if (excludeChannelArticles) {
              builder
                .leftJoin(
                  this.knexRO
                    .select('article_id')
                    .from('topic_channel_article as tca')
                    .join('topic_channel as tc', 'tca.channel_id', 'tc.id')
                    .where({
                      'tca.enabled': true,
                      'tc.enabled': true,
                    })
                    .as('enabled_article_channels'),
                  'article.id',
                  'enabled_article_channels.article_id'
                )
                .whereNull('enabled_article_channels.article_id')
            }
          })
          .orderBy('article.id', 'desc')
          .as('article_set')
      )
      .where((builder) => {
        if (spamThreshold) {
          builder.modify(excludeSpamModifier, spamThreshold, 'article_set')
        }
      }) as Knex.QueryBuilder<any>

  /*********************************
   *                               *
   *       Article Content         *
   *                               *
   *********************************/

  public loadLatestArticleContent = async (articleId: string) => {
    const { contentId } = await this.latestArticleVersionLoader.load(articleId)
    const { content } = await this.models.articleContentIdLoader.load(contentId)
    return content
  }

  public loadLatestArticlesContentByContentIds = async (
    contentIds: string[]
  ) => {
    return this.models.articleContentIdLoader.loadMany(contentIds)
  }

  public loadLatestArticleContentMd = async (articleId: string) => {
    const { contentMdId } = await this.latestArticleVersionLoader.load(
      articleId
    )
    if (!contentMdId) {
      return ''
    }
    const { content: contentMd } =
      await this.models.articleContentIdLoader.load(contentMdId)
    return contentMd
  }

  /*********************************
   *                               *
   *       Article Version         *
   *                               *
   *********************************/

  public loadLatestArticleVersion = (articleId: string) =>
    this.latestArticleVersionLoader.load(articleId)

  public loadLatestArticlesVersion = (articleIds: string[]) =>
    this.latestArticleVersionLoader.loadMany(articleIds)

  public findVersionByMediaHash = async (mediaHash: string) =>
    this.models.findFirst({ table: 'article_version', where: { mediaHash } })

  public countArticleVersions = async (articleId: string) =>
    this.models.count({ table: 'article_version', where: { articleId } })

  public findArticleVersions = async (
    articleId: string,
    { take, skip }: { take?: number; skip?: number } = {},
    all = false
  ) => {
    const revisionCols =
      '(title, summary, content_id, content_md_id, tags, connections, cover)'
    const records = await this.knexRO('article_version')
      .select('*', this.knexRO.raw('COUNT(1) OVER() ::int AS total_count'))
      .from(
        this.knexRO('article_version')
          .where({ articleId })
          .modify((builder) => {
            if (!all) {
              builder.select(
                '*',
                this.knexRO.raw(
                  `LAG(${revisionCols}, 1) OVER(order by id) AS pre_cols`
                )
              )
            } else {
              builder.select('*')
            }
          })
          .orderBy('id', 'desc')
          .as('t')
      )
      .modify((builder) => {
        if (!all) {
          builder
            .where(
              this.knexRO.raw(revisionCols),
              '!=',
              this.knexRO.ref('pre_cols')
            )
            .orWhere((whereBuilder) => {
              // first version
              whereBuilder.whereNull('pre_cols')
            })
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })
    return [records, +(records[0]?.totalCount ?? 0)]
  }

  public validateArticle = async (articleId: string) => {
    const article = await this.models.articleIdLoader.load(articleId)
    if (!article) {
      throw new ArticleNotFoundError('article does not exist')
    }
    if (article.state !== ARTICLE_STATE.active) {
      throw new ForbiddenError('only active article is allowed to be edited.')
    }
    const articleVersion = await this.loadLatestArticleVersion(articleId)
    if (!articleVersion) {
      throw new ArticleNotFoundError('article version does not exist')
    }
    return [article, articleVersion] as const
  }

  /*********************************
   *                               *
   *          Pinning              *
   *                               *
   *********************************/
  /**
   * Update article's pin status and return article
   * Throw error if there already has 3 pinned articles/collections
   * or user is not the author of the article.
   */
  public updatePinned = async (
    articleId: string,
    userId: string,
    pinned: boolean
  ) => {
    const article = await this.baseFindById(articleId)
    if (!article) {
      throw new ArticleNotFoundError('Cannot find article')
    }
    if (article.authorId !== userId) {
      throw new ForbiddenError('Only author can pin article')
    }
    const userWorkService = new UserWorkService(this.connections)
    const totalPinned = await userWorkService.totalPinnedWorks(userId)
    if (pinned === article.pinned) {
      return article
    }
    if (pinned && totalPinned >= MAX_PINNED_WORKS_LIMIT) {
      throw new ActionLimitExceededError(
        `Can only pin up to ${MAX_PINNED_WORKS_LIMIT} articles/collections`
      )
    }
    await this.baseUpdate(articleId, {
      pinned,
      pinnedAt: this.knex.fn.now() as unknown as Date,
    })
    return { ...article, pinned }
  }

  public findPinnedByAuthor = async (authorId: string) =>
    this.baseFind({
      where: { authorId, pinned: true, state: ARTICLE_STATE.active },
    })

  /**
   * Archive article
   */
  public archive = async (id: string) => {
    const notificationService = new NotificationService(this.connections)
    notificationService.withdraw(`publication:${id}`)
    return this.models.update({
      table: 'article',
      where: { id },
      data: {
        state: ARTICLE_STATE.archived,
        pinned: false,
      },
    })
  }

  /**
   * Boost & Score
   */
  public setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate<ArticleBoost>({
      where: { articleId: id },
      data: { articleId: id, boost },
      table: 'article_boost',
    })

  /*********************************
   *                               *
   *          Appreciation         *
   *                               *
   *********************************/
  /**
   * Sum total appreciation by a given article id.
   */
  public sumAppreciation = async (articleId: string) => {
    const result = await this.knex
      .select()
      .from('appreciation')
      .whereIn(
        ['reference_id', 'purpose'],
        [
          [articleId, APPRECIATION_PURPOSE.appreciate],
          [articleId, APPRECIATION_PURPOSE.appreciateSubsidy],
        ]
      )
      .sum('amount as sum')
      .first()
    return parseInt(result?.sum || '0', 10)
  }

  /**
   * Count an article's appreciations by a given articleId.
   */
  public countAppreciations = async (articleId: string) => {
    const result = await this.knexRO('appreciation')
      .countDistinct(this.knexRO.raw('(sender_id, reference_id)'))
      .where({
        referenceId: articleId,
        purpose: APPRECIATION_PURPOSE.appreciate,
      })
    const count = (result[0] as { count: string }).count
    return +count
  }

  /**
   * Find an article's appreciations by a given articleId.
   */
  public findAppreciations = async ({
    referenceId,
    take,
    skip,
  }: {
    referenceId: string
    take?: number
    skip?: number
  }) =>
    this.knexRO('appreciation')
      .select(
        'reference_id',
        'sender_id',
        this.knexRO.raw('count(1) OVER() AS total_count')
      )
      .where({
        referenceId,
        purpose: APPRECIATION_PURPOSE.appreciate,
      })
      .groupBy('sender_id', 'reference_id')
      .sum('amount as amount')
      .max('created_at as created_at')
      .orderBy('created_at', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  public appreciateLeftByUser = async ({
    articleId,
    userId,
  }: {
    articleId: string
    userId: string
  }) => {
    const appreciations = await this.knex('appreciation')
      .select()
      .where({
        senderId: userId,
        referenceId: articleId,
        purpose: APPRECIATION_PURPOSE.appreciate,
      })
      .sum('amount as total')
      .first()
    const total = appreciations?.total ?? 0

    return Math.max(ARTICLE_APPRECIATE_LIMIT - total, 0)
  }

  /**
   * User appreciate an article
   */
  public appreciate = async ({
    articleId,
    senderId,
    recipientId,
    amount,
    type,
  }: {
    articleId: string
    senderId: string
    recipientId: string
    amount: number
    type: string
  }) => {
    const appreciation = {
      senderId,
      recipientId,
      referenceId: articleId,
      purpose: APPRECIATION_PURPOSE.appreciate,
      type,
    }

    // find appreciations within 1 minutes and bundle
    const bundle = await this.knex('appreciation')
      .select()
      .where(appreciation)
      .andWhere(
        'created_at',
        '>=',
        this.knex.raw(`now() - INTERVAL '5 minutes'`)
      )
      .orderBy('created_at')
      .first()

    let result

    if (bundle) {
      result = await this.knex('appreciation')
        .where({ id: bundle.id })
        .where(
          ARTICLE_APPRECIATE_LIMIT,
          '>=',
          this.knex('appreciation')
            .select()
            .where({
              senderId,
              referenceId: articleId,
              purpose: APPRECIATION_PURPOSE.appreciate,
            })
            .sum('amount')
        )
        .update({
          amount: Math.min(bundle.amount + amount, ARTICLE_APPRECIATE_LIMIT),
          createdAt: this.knex.fn.now(),
        })
        .returning('*')
    } else {
      const uuid = v4()
      const validAmount = Math.min(amount, ARTICLE_APPRECIATE_LIMIT)
      result = await this.knex('appreciation')
        .where(
          ARTICLE_APPRECIATE_LIMIT,
          '>=',
          this.knex('appreciation')
            .select()
            .where({
              senderId,
              referenceId: articleId,
              purpose: APPRECIATION_PURPOSE.appreciate,
            })
            .sum('amount')
        )
        .insert({
          ...appreciation,
          uuid,
          amount: validAmount,
        })
        .into('appreciation')
        .returning('*')
    }

    return result
  }

  /*********************************
   *                               *
   *              Tag              *
   *                               *
   *********************************/
  /**
   * Find tags by a given article id.
   */
  public findTagIds = async ({
    id: articleId,
  }: {
    id: string
  }): Promise<string[]> => {
    const result = await this.knex
      .select('tag_id')
      .from('article_tag')
      .where({ articleId })
      .orderBy('created_at', 'desc')

    return result.map(({ tagId }: { tagId: string }) => tagId)
  }

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  /**
   * User read an article
   */
  public read = async ({
    userId,
    articleId,
    ip,
  }: {
    articleId: string
    userId?: string | null
    ip?: string
  }) => {
    const table = 'article_read_count'

    /** *
     * recording parameters:
     * updatedAt: last heart beat update
     * lastRead: last new read start timestamp
     * readTime: total read time in seconds, accumulated from heart beat and updatedAt
     */

    // current read data
    const newData = {
      articleId,
      userId,
      updatedAt: new Date(),
      archived: false,
      ip,
    }

    // get past record
    const record = await this.baseFind({ where: { articleId, userId }, table })

    /**
     * Case 1: no past record exists
     * create new record and return
     */
    if (!record || record.length === 0) {
      await this.baseCreate<any>(
        {
          ...newData,
          count: 1,
          timedCount: 1,
          readTime: userId ? 0 : null,
          lastRead: new Date(),
        },
        table
      )
      return { newRead: true }
    }

    // get old data
    const oldData = record[0]

    // prepare function to only update count
    const updateReadCount = async () => {
      await this.baseUpdate(
        oldData.id,
        {
          ...oldData,
          ...newData,
          count: parseInt(oldData.count, 10) + 1,
          timedCount: parseInt(oldData.timedCount, 10) + 1,
          lastRead: new Date(),
        },
        table
      )
    }

    /**
     *
     * Case 2: visitor
     * don't accumulate read time
     * add a new count and update last read timestamp for visitors
     */
    if (!userId) {
      await updateReadCount()
      return { newRead: true }
    }

    // for logged-in user, calculate lapsed time in milliseconds
    // based on updatedAt
    const lapse = Date.now() - new Date(oldData.updatedAt).getTime()

    // calculate total time since last read started
    const readLength = Date.now() - new Date(oldData.lastRead).getTime()

    // calculate total read time by accumulating heart beat
    const readTime = Math.round(parseInt(oldData.readTime, 10) + lapse / 1000)

    /**
     * Case 3: user continuous read that exceeds 30 minutes
     * stop accumulating read time and only update updatedAt
     *
     * also check if lapse time is longer than 5 minutes,
     * if so it's a new read and go to case 4
     */
    if (lapse < MINUTE * 5 && readLength > MINUTE * 30) {
      await this.baseUpdate(
        oldData.id,
        {
          updatedAt: newData.updatedAt,
        },
        table
      )
      return { newRead: false }
    }

    /**
     * Case 4: lapse equal or longer than 5 minutes
     * treat as a new read
     * add a new count and update last read timestamp
     */
    if (lapse >= MINUTE * 5) {
      await updateReadCount()
      return { newRead: true }
    }

    /**
     * Case 5: all other normal readings
     * accumulate time and update data
     */
    await this.baseUpdate(
      oldData.id,
      {
        ...oldData,
        ...newData,
        readTime,
      },
      table
    )
    this.searchService.updateArticleReadData(articleId)
    return { newRead: false }
  }

  public addReadCountColumn = (
    articlesQuery: Knex.QueryBuilder,
    { start }: { start?: Date } = {}
  ) => {
    const knex = articlesQuery.client.queryBuilder()
    const column = 'read_count'
    return {
      query: knex
        .clone()
        .from(articlesQuery.clone().as('t1'))
        .leftJoin(
          knex
            .clone()
            .from('article_read_count')
            .modify((builder) => {
              if (start) {
                builder.where('created_at', '>=', start)
              }
            })
            .groupBy('article_id')
            .select(
              'article_id',
              knex.client.raw('count(timed_count) as ??', [column])
            )
            .as('t2'),
          't1.id',
          't2.article_id'
        )
        .select(
          't1.*',
          knex.client.raw('COALESCE(t2.??, 0) as ??', [column, column])
        ),
      column,
    }
  }

  public addReadTimeColumn = (articlesQuery: Knex.QueryBuilder) => {
    const knex = articlesQuery.client.queryBuilder()
    const column = 'sum_read_time'
    return {
      query: knex
        .clone()
        .from(articlesQuery.clone().as('t1'))
        .leftJoin(
          'article_read_time_materialized',
          't1.id',
          'article_read_time_materialized.article_id'
        )
        .select(
          't1.*',
          knex.client.raw(
            'COALESCE(article_read_time_materialized.??, 0) as ??',
            [column, column]
          )
        ),
      column,
    }
  }

  /*********************************
   *                               *
   *          Connection           *
   *                               *
   *********************************/
  /**
   * Find an article's connections by a given article id.
   */
  public findConnections = async ({
    entranceId,
    take,
    skip,
  }: {
    entranceId: string
    take?: number
    skip?: number
  }) =>
    this.knexRO('article_connection')
      .select('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId, state: ARTICLE_STATE.active })
      .orderBy('order', 'asc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

  /**
   * Count an article is connected by how many active articles.
   */
  public countActiveConnectedBy = async (id: string) => {
    const query = this.knexRO('article_connection')
      .rightJoin('article', 'article_connection.entrance_id', 'article.id')
      .where({
        'article_connection.article_id': id,
        'article.state': ARTICLE_STATE.active,
      })
      .countDistinct('entrance_id')
      .first()
    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *           Response            *
   *                               *
   *********************************/
  public findResponses = ({
    id,
    order = 'desc',
    after,
    before,
    first,
    includeAfter = false,
    includeBefore = false,
    articleOnly = false,
  }: {
    id: string
    order?: string
    after?: { type: NODE_TYPES; id: string }
    before?: { type: NODE_TYPES; id: string }
    first?: number
    includeAfter?: boolean
    includeBefore?: boolean
    articleOnly?: boolean
  }) => {
    const subQuery = this.knexRO
      .select(
        this.knexRO.raw('count(1) OVER() AS total_count'),
        this.knexRO.raw('min(created_at) OVER() AS min_cursor'),
        this.knexRO.raw('max(created_at) OVER() AS max_cursor'),
        '*'
      )
      .from(
        this.knexRO
          .select(
            this.knexRO.raw(
              "'Article' AS type, entrance_id AS entity_id, article_connection.created_at"
            )
          )
          .from('article_connection')
          .rightJoin('article', 'article_connection.entrance_id', 'article.id')
          .where({
            'article_connection.article_id': id,
            'article.state': ARTICLE_STATE.active,
          })
          .modify((builder: Knex.QueryBuilder) => {
            if (articleOnly !== true) {
              builder.union(
                this.knexRO
                  .select(
                    this.knexRO.raw(
                      "'Comment' AS type, id AS entity_id, created_at"
                    )
                  )
                  .fromRaw('comment AS outer_comment')
                  .where({
                    targetId: id,
                    parentCommentId: null,
                  })
                  .andWhere((andWhereBuilder) => {
                    andWhereBuilder
                      .where({ state: COMMENT_STATE.active })
                      .orWhere({ state: COMMENT_STATE.collapsed })
                      .orWhere((orWhereBuilder) => {
                        orWhereBuilder.andWhere(
                          this.knexRO.raw(
                            '(SELECT count(1) FROM comment WHERE state IN (?, ?) AND parent_comment_id = outer_comment.id)',
                            [COMMENT_STATE.active, COMMENT_STATE.collapsed]
                          ),
                          '>',
                          0
                        )
                      })
                  })
              )
            }
          })
          .orderBy('created_at', order)
          .as('source')
      )

    const query = this.knexRO.from(subQuery.as('t1'))

    const validTypes = [NODE_TYPES.Comment, NODE_TYPES.Article]
    if (after) {
      if (!validTypes.includes(after.type)) {
        throw new InvalidCursorError('after is invalid cursor')
      }
      const cursor = this.knexRO(after.type.toLowerCase())
        .select('created_at')
        .where({ id: after.id })
        .first()
      if (includeAfter) {
        query.andWhere('created_at', order === 'asc' ? '>=' : '<=', cursor)
      } else {
        query.andWhere('created_at', order === 'asc' ? '>' : '<', cursor)
      }
    }
    if (before) {
      if (!validTypes.includes(before.type)) {
        throw new InvalidCursorError('before is invalid cursor')
      }
      const cursor = this.knexRO(before.type.toLowerCase())
        .select('created_at')
        .where({ id: before.id })
        .first()
      if (includeBefore) {
        query.andWhere('created_at', order === 'asc' ? '<=' : '>=', cursor)
      } else {
        query.andWhere('created_at', order === 'asc' ? '<' : '>', cursor)
      }
    }
    if (first) {
      query.limit(first)
    }
    return query
  }

  /*********************************
   *                               *
   *          Transaction          *
   *                               *
   *********************************/
  public makeTransactionsQuery = ({
    purpose = TRANSACTION_PURPOSE.donation,
    state = TRANSACTION_STATE.succeeded,
    targetId,
    senderId,
    targetType,
    excludeNullSender,
  }: {
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    senderId?: string
    targetType: string
    excludeNullSender?: boolean
  }) => {
    const where = {
      purpose,
      state,
      targetId,
      targetType,
    }

    const rankedTransactionsSubquery = this.knexRO('transaction')
      .select([
        'id',
        'sender_id',
        'target_id',
        this.knexRO.raw(
          'row_number() OVER (PARTITION BY target_id, sender_id ORDER BY id) AS rn'
        ),
      ])
      .where(where)
      .whereNotNull('sender_id')
      .modify((builder: Knex.QueryBuilder) => {
        if (senderId) {
          builder.where({ senderId })
        }
      })
      .as('RankedTransactions')

    const rankedTransactions = this.knexRO
      .from(rankedTransactionsSubquery)
      .select(['id', 'sender_id', 'target_id'])
      .where('rn', 1)

    const nullSenderTransactions = this.knexRO('transaction')
      .select(['id', 'sender_id', 'target_id'])
      .where(where)
      .whereNull('sender_id')

    if (excludeNullSender) {
      return rankedTransactions
    }

    return rankedTransactions.unionAll([nullSenderTransactions])
  }

  /**
   * Count an article's transactions by a given articleId and group by sender.
   */
  public countTransactions = async (params: {
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
    senderId?: string
    excludeNullSender?: boolean
  }) => {
    const { id: targetType } = await this.baseFindEntityTypeId(
      params.targetType || TRANSACTION_TARGET_TYPE.article
    )
    const combinedQuery = this.makeTransactionsQuery({
      ...params,
      targetType,
    })

    const result = await this.knexRO
      .select()
      .from(combinedQuery.as('source'))
      .count()
      .first()

    return parseInt((result?.count as string) || '0', 10)
  }

  /**
   * Find an article's transactions by a given articleId and group by sender.
   */
  public findTransactions = async ({
    take,
    skip,
    ...restParams
  }: {
    take?: number
    skip?: number
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
    senderId?: string
    excludeNullSender?: boolean
  }) => {
    const { id: targetType } = await this.baseFindEntityTypeId(
      restParams.targetType || TRANSACTION_TARGET_TYPE.article
    )
    const combinedQuery = this.makeTransactionsQuery({
      ...restParams,
      targetType,
    })

    return combinedQuery
      .orderBy('id', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })
  }

  /**
   * Count articles which also donated by the donator of a given article
   */
  private makeRelatedDonationsQuery = ({
    articleId,
    targetTypeId,
    notIn,
  }: {
    articleId: string
    targetTypeId: string
    notIn: string[]
  }) => {
    // 1 LIKE = 0.05 HKD
    const RATE_HKD_TO_LIKE = 20

    const baseWhere = {
      targetType: targetTypeId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    }

    const donatorsQuery = this.knex('transaction')
      .select('sender_id as user_id')
      .where({
        targetId: articleId,
        ...baseWhere,
      })
      .groupBy('sender_id')
      .as('donators')

    const relatedDonationsQuery = this.knex('transaction')
      .select('target_id')
      .select(
        this.knex.raw(`
            sum(
              CASE WHEN currency = 'HKD' THEN
                amount * ${RATE_HKD_TO_LIKE}
              ELSE
                amount
              END
            ) score
          `)
      )
      .rightJoin(donatorsQuery, 'donators.user_id', 'transaction.sender_id')
      .where({ ...baseWhere })
      .whereNotIn('target_id', notIn)
      .groupBy('target_id')
      .as('related_donations')

    return this.knex
      .select('article.*')
      .from(this.table)
      .rightJoin(
        relatedDonationsQuery,
        'article.id',
        'related_donations.target_id'
      )
      .where({ state: ARTICLE_STATE.active })
  }

  public countRelatedDonations = async ({
    articleId,
    notIn,
  }: {
    articleId: string
    notIn: string[]
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const query = this.makeRelatedDonationsQuery({
      articleId,
      targetTypeId: entityTypeId,
      notIn,
    })

    const result = await this.knex.from(query.as('base')).count().first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find articles which also donated by the donator of a given article
   */
  public findRelatedDonations = async ({
    articleId,
    notIn,
    take,
    skip,
  }: {
    articleId: string
    notIn: string[]
    take?: number
    skip?: number
  }): Promise<Article[]> => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const query = this.makeRelatedDonationsQuery({
      articleId,
      targetTypeId: entityTypeId,
      notIn,
    })

    if (skip !== undefined && Number.isFinite(skip)) {
      query.offset(skip)
    }
    if (take !== undefined && Number.isFinite(take)) {
      query.limit(take)
    }

    return query.orderBy('score')
  }

  /*********************************
   *                               *
   *            Access             *
   *                               *
   *********************************/

  public getAccess = async (id: string) => {
    const articleCircle = await this.findArticleCircle(id)

    // not in circle, fallback to public
    if (!articleCircle) {
      return ARTICLE_ACCESS_TYPE.public
    }

    // public
    if (articleCircle.access === ARTICLE_ACCESS_TYPE.public) {
      return ARTICLE_ACCESS_TYPE.public
    }

    // paywall
    return ARTICLE_ACCESS_TYPE.paywall
  }

  public findArticleCircle = async (articleId: string) =>
    this.knex
      .select('article_circle.*')
      .from('article_circle')
      .join('circle', 'article_circle.circle_id', 'circle.id')
      .where({
        'article_circle.article_id': articleId,
        'circle.state': CIRCLE_STATE.active,
      })
      .first()

  public countReaders = async (articleId: string): Promise<number> => {
    const res = await this.knexRO('article_ga4_data')
      .where({ articleId })
      .select(this.knex.raw('SUM(total_users) as reader_amount'))
      .first()
    return parseInt(res?.readerAmount || '0', 10)
  }

  /*********************************
   *                               *
   *          Translation          *
   *                               *
   *********************************/

  public getOrCreateTranslation = async (
    articleVersion: ArticleVersion,
    language: LANGUAGES,
    actorId?: string,
    model?: GQLTranslationModel
  ): Promise<GQLArticleTranslation | null> => {
    // paywalled content
    const { id: articleVersionId, articleId, contentId } = articleVersion
    const { authorId } = await this.models.articleIdLoader.load(articleId)
    let isPaywalledContent = false
    const isAuthor = authorId === actorId
    const articleCircle = await this.findArticleCircle(articleId)
    if (
      !isAuthor &&
      articleCircle &&
      articleCircle.access === ARTICLE_ACCESS_TYPE.paywall
    ) {
      if (actorId) {
        const paymentService = new PaymentService(this.connections)
        const isCircleMember = await paymentService.isCircleMember({
          userId: actorId,
          circleId: articleCircle.circleId,
        })

        // not circle member
        if (!isCircleMember) {
          isPaywalledContent = true
        }
      } else {
        isPaywalledContent = true
      }
    }

    // Load article content
    const { content } = await this.models.articleContentIdLoader.load(contentId)

    // check if language match article original language
    if (articleVersion.language && articleVersion.language === language) {
      // return original content directly
      return {
        title: articleVersion.title,
        content: isPaywalledContent ? '' : content,
        summary: articleVersion.summary,
        language,
      }
    }

    // return translation if exists
    const translation = await this.models.findFirst({
      table: 'article_translation',
      where: {
        articleId,
        articleVersionId,
        language,
        ...(model ? { model } : {}),
      },
    })

    if (translation) {
      return {
        title: translation.title,
        content: isPaywalledContent ? '' : translation.content,
        summary: translation.summary,
        language: translation.language,
        model: translation.model,
      }
    }

    // Handle Chinese conversion using OpenCC
    const canUseOpenCC =
      (articleVersion.language === LANGUAGE.zh_hans &&
        language === LANGUAGE.zh_hant) ||
      (articleVersion.language === LANGUAGE.zh_hant &&
        language === LANGUAGE.zh_hans)

    if (canUseOpenCC) {
      const type = articleVersion.language === LANGUAGE.zh_hans ? 's2t' : 't2s'

      const convertedTitle = simplecc(articleVersion.title, type)
      const convertedContent = simplecc(content, type)
      const convertedSummary = articleVersion.summary
        ? simplecc(articleVersion.summary, type)
        : null

      await this.models.create({
        table: 'article_translation',
        data: {
          articleId,
          articleVersionId,
          language,
          title: convertedTitle,
          content: convertedContent,
          summary: convertedSummary,
          model: 'opencc',
        },
      })

      return {
        title: convertedTitle,
        content: isPaywalledContent ? '' : convertedContent,
        summary: convertedSummary,
        language,
        model: 'opencc',
      }
    }

    // Otherwise, translate with LLM
    let translatedTitle: string | null = null
    let translatedContent: string | null = null
    let translatedSummary: string | null = null
    let translatedModel: GQLTranslationModel | null = null

    const [llmTitle, llmContent, llmSummary] = await Promise.all([
      this.openRouter.translate(articleVersion.title, language, model),
      this.openRouter.translate(content, language, model, true),
      articleVersion.summary
        ? this.openRouter.translate(articleVersion.summary, language, model)
        : null,
    ])

    if (
      llmTitle &&
      llmContent &&
      (articleVersion.summary ? llmSummary : true)
    ) {
      await this.models.create({
        table: 'article_translation',
        data: {
          articleId,
          articleVersionId,
          language,
          title: llmTitle.text,
          content: llmContent.text,
          summary: llmSummary?.text,
          model: llmTitle.model,
        },
      })

      translatedTitle = llmTitle.text
      translatedContent = llmContent.text
      translatedModel = llmTitle.model
      if (llmSummary) {
        translatedSummary = llmSummary.text
      }
    }

    if (!translatedTitle || !translatedContent || !translatedModel) {
      return null
    }

    return {
      title: translatedTitle,
      content: isPaywalledContent ? '' : translatedContent,
      summary: translatedSummary,
      language,
      model: translatedModel,
    }
  }

  /*********************************
   *                               *
   *         Authoring             *
   *                               *
   *********************************/

  public addArticleCountColumn = (
    authorsQuery: Knex.QueryBuilder,
    { joinColumn = 'id' }: { joinColumn?: string } = {}
  ) => {
    const column = 'article_count'
    const knex = authorsQuery.client.queryBuilder()
    return {
      query: knex
        .clone()
        .from(authorsQuery.clone().as('t1'))
        .leftJoin(
          knex
            .clone()
            .from('article')
            .groupBy('author_id')
            .select('author_id', knex.client.raw('count(*) as ??', [column]))
            .as('t2'),
          `t1.${joinColumn}`,
          't2.author_id'
        )
        .select(
          't1.*',
          knex.client.raw('COALESCE(t2.??, 0) as ??', [column, column])
        ),
      column,
    }
  }
}

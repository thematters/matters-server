import type {
  GQLSearchExclude,
  GQLSearchFilter,
  Draft,
  Article,
  ArticleVersion,
  ArticleBoost,
  Connections,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  APPRECIATION_PURPOSE,
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  CIRCLE_STATE,
  COMMENT_TYPE,
  COMMENT_STATE,
  NOTICE_TYPE,
  MINUTE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  MAX_PINNED_WORKS_LIMIT,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
  USER_ACTION,
  USER_STATE,
  NODE_TYPES,
  QUEUE_URL,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ArticleNotFoundError,
  ForbiddenError,
  ActionLimitExceededError,
  ActionFailedError,
  InvalidCursorError,
  EntityNotFoundError,
  ArticleCollectionReachLimitError,
} from '#common/errors.js'
import { getLogger } from '#common/logger.js'
import {
  countWords,
  shortHash,
  normalizeSearchKey,
  genMD5,
  excludeSpam as excludeSpamModifier,
  excludeRestricted as excludeRestrictedModifier,
} from '#common/utils/index.js'
import {
  BaseService,
  SystemService,
  UserWorkService,
  TagService,
  NotificationService,
  PaymentService,
  GCP,
  SpamDetector,
  ChannelService,
  aws,
} from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import DataLoader from 'dataloader'
import _ from 'lodash'
import { createRequire } from 'node:module'
import { simplecc } from 'simplecc-wasm'
import { v4 } from 'uuid'

const { difference, isEqual, uniq } = _

const require = createRequire(import.meta.url)
const { html2md } = require('@matters/matters-editor/transformers')

const logger = getLogger('service-article')

const SEARCH_TITLE_RANK_THRESHOLD = 0.001
const SEARCH_DEFAULT_TEXT_RANK_THRESHOLD = 0.0001

export class ArticleService extends BaseService<Article> {
  public latestArticleVersionLoader: DataLoader<string, ArticleVersion>

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
  }

  /*********************************
   *                               *
   *          Article CRUD         *
   *                               *
   *********************************/

  public findArticles = (filter?: {
    isSpam?: boolean
    spamThreshold?: number
    datetimeRange?: { start: Date; end?: Date }
  }) => {
    const query = this.knexRO('article').select('*')

    if (filter?.isSpam) {
      query.where((builder) => {
        builder.where('is_spam', '=', true).orWhere((orWhereBuilder) => {
          orWhereBuilder
            .whereRaw('spam_score >= ?', [filter.spamThreshold])
            .whereNull('is_spam')
        })
      })
    }
    if (filter?.datetimeRange) {
      query.where('created_at', '>=', filter.datetimeRange.start)
      if (filter.datetimeRange.end) {
        query.where('created_at', '<=', filter.datetimeRange.end)
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
  }: {
    spamThreshold?: number
    excludeChannelArticles?: boolean
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

  /**
   * Create article from draft
   */
  public createArticle = async ({
    id: draftId,
    authorId,
    title,
    summary,
    content,
    contentMd,
    cover,
    tags,
    collection,
    circleId,
    access,
    license,
    requestForDonation,
    replyToDonator,
    canComment,
    indentFirstLine,
    sensitiveByAuthor,
  }: Partial<Draft> & {
    authorId: string
    title: string
    content: string
  }): Promise<[Article, ArticleVersion]> => {
    const wordCount = countWords(content)
    const summaryCustomized = !!summary

    // get contentId and contentMdId
    const { id: contentId } = await this.getOrCreateArticleContent(content)
    let _contentMd
    try {
      _contentMd = contentMd || html2md(content)
    } catch (e) {
      logger.warn('draft %s failed to convert HTML to Markdown', draftId)
    }
    let contentMdId
    if (_contentMd) {
      const { id: _contentMdId } = await this.getOrCreateArticleContent(
        _contentMd
      )
      contentMdId = _contentMdId
    }

    // create article and article version
    const trx = await this.knex.transaction()
    try {
      const [article] = await trx<Article>('article')
        .insert({
          authorId,
          state: ARTICLE_STATE.active,
          shortHash: shortHash(), // retry handling at higher level of a very low probability of collision, or increase the nanoid length when it comes to higher probability;
        })
        .returning('*')
      const [articleVersion] = await trx<ArticleVersion>('article_version')
        .insert({
          articleId: article.id,
          title,
          summary: summary || '',
          summaryCustomized,
          contentId,
          contentMdId,
          cover,
          tags: tags ?? [],
          connections: collection ?? [],
          wordCount,
          circleId,
          access: access ?? ARTICLE_ACCESS_TYPE.public,
          license: license ?? ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4,
          requestForDonation,
          replyToDonator,
          canComment: canComment ?? true,
          indentFirstLine: indentFirstLine ?? false,
          sensitiveByAuthor: sensitiveByAuthor ?? false,
        })
        .returning('*')
      await trx.commit()

      this.postArticleCreation({
        articleId: article.id,
        articleVersionId: articleVersion.id,
        title,
        content,
        summary: summaryCustomized ? summary : undefined,
      })

      // copy asset_map from draft to article if there is a draft
      if (draftId) {
        const systemService = new SystemService(this.connections)
        const [draftEntity, articleEntity] = await Promise.all([
          systemService.baseFindEntityTypeId('draft'),
          systemService.baseFindEntityTypeId('article'),
        ])
        await systemService.copyAssetMapEntities({
          source: { entityTypeId: draftEntity.id, entityId: draftId },
          target: { entityTypeId: articleEntity.id, entityId: article.id },
        })
      }
      return [article, articleVersion]
    } catch (e) {
      await trx.rollback()
      throw e
    }
  }

  /*********************************
   *                               *
   *       Article Content         *
   *                               *
   *********************************/

  public getOrCreateArticleContent = async (content: string) => {
    const contentHash = genMD5(content)
    const result = await this.models.findUnique({
      table: 'article_content',
      where: { hash: contentHash },
    })
    if (result) {
      return result
    } else {
      return this.models.create({
        table: 'article_content',
        data: { hash: contentHash, content },
      })
    }
  }

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

  public createNewArticleVersion = async (
    articleId: string,
    actorId: string,
    newData: Partial<Draft>,
    description?: string
  ) => {
    if (Object.keys(newData).length === 0) {
      throw new ActionFailedError('newData is empty')
    }
    const lastData = await this.latestArticleVersionLoader.load(articleId)
    let data = { ...lastData } as Partial<ArticleVersion>
    delete data.id
    delete data.description
    delete data.createdAt
    delete data.updatedAt

    if (newData.content) {
      const { id: contentId } = await this.getOrCreateArticleContent(
        newData.content
      )
      data = { ...data, contentId, wordCount: countWords(newData.content) }
      let _contentMd
      try {
        _contentMd = newData.contentMd || html2md(newData.content)
      } catch (e) {
        logger.warn(
          'failed to convert HTML to Markdown for new article version of article %s',
          articleId
        )
      }
      if (_contentMd) {
        const { id: _contentMdId } = await this.getOrCreateArticleContent(
          _contentMd
        )
        data = { ...data, contentMdId: _contentMdId }
        delete newData.content
      }
    } else {
      data = {
        ...data,
        contentId: lastData.contentId,
        contentMdId: lastData.contentMdId,
        wordCount: lastData.wordCount,
        dataHash: lastData.dataHash,
        mediaHash: lastData.mediaHash,
        iscnId: lastData.iscnId,
      }
    }
    if (newData.summary || newData.summary === null || newData.summary === '') {
      data = {
        ...data,
        summary: newData.summary ?? '',
        summaryCustomized: newData.summary ? true : false,
      }
      delete newData.summary
    } else {
      data = {
        ...data,
        summary: lastData.summary,
        summaryCustomized: lastData.summaryCustomized,
      }
    }
    if (newData.collection || newData.collection === null) {
      data = { ...data, connections: newData.collection ?? [] }
      await this.updateArticleConnections({
        articleId,
        connections: newData.collection ?? [],
      })
      delete newData.collection
    }

    if (newData.circleId) {
      const _data = { articleId, circleId: newData.circleId }
      await this.models.upsert({
        table: 'article_circle',
        where: _data,
        create: { ..._data, access: newData.access || data.access },
        update: { ..._data, access: newData.access || data.access },
      })
    }
    if (newData.circleId === null) {
      await this.models.deleteMany({
        table: 'article_circle',
        where: { articleId },
      })
    }

    if (newData.tags || newData.tags === null) {
      const tagService = new TagService(this.connections)
      await tagService.updateArticleTags({
        articleId,
        actorId,
        tags: newData.tags ?? [],
      })
      data = { ...data, tags: newData.tags ?? [] }
      delete newData.tags
    }

    const articleVersion = await this.models.create({
      table: 'article_version',
      data: { ...data, ...newData, description } as Partial<ArticleVersion>,
    })

    if (newData.content) {
      this.postArticleCreation({
        articleId,
        articleVersionId: articleVersion.id,
        title: articleVersion.title,
        content: newData.content,
        summary: articleVersion.summaryCustomized
          ? articleVersion.summary
          : undefined,
      })
    }
    this.latestArticleVersionLoader.clear(articleId)
    return articleVersion
  }

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
  public archive = async (id: string) =>
    this.baseUpdate(id, {
      state: ARTICLE_STATE.archived,
      pinned: false,
      updatedAt: new Date(),
    })

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/

  public search = async ({
    key: keyOriginal,
    take = 10,
    skip = 0,
    filter,
    exclude,
    viewerId,
    coefficients,
    quicksearch,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    filter?: GQLSearchFilter
    exclude?: GQLSearchExclude
    coefficients?: string
    quicksearch?: boolean
  }) => {
    if (quicksearch) {
      return this.quicksearch({ key: keyOriginal, take, skip, filter })
    }
    const key = await normalizeSearchKey(keyOriginal)
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      logger.error(err)
    }

    const c0 = +(
      coeffs?.[0] ||
      environment.searchPgArticleCoefficients?.[0] ||
      1
    )
    const c1 = +(
      coeffs?.[1] ||
      environment.searchPgArticleCoefficients?.[1] ||
      1
    )
    const c2 = +(
      coeffs?.[2] ||
      environment.searchPgArticleCoefficients?.[2] ||
      1
    )
    const c3 = +(
      coeffs?.[3] ||
      environment.searchPgArticleCoefficients?.[3] ||
      1
    )

    // TODO: add below logic to searchV3
    // gather users that blocked viewer
    const excludeBlocked = exclude === 'blocked' && viewerId
    let blockedIds: string[] = []
    if (excludeBlocked) {
      blockedIds = (
        await this.knexRO('action_user')
          .select('user_id')
          .where({ action: USER_ACTION.block, targetId: viewerId })
      ).map(({ userId }) => userId)
    }
    // gather articles blocked by admin
    const articleIds = (
      await this.knexRO('article_recommend_setting')
        .where({ inSearch: false })
        .select('articleId')
    ).map(({ articleId }) => articleId)

    const baseQuery = this.searchKnex
      .from(
        this.searchKnex
          .select(
            '*',
            this.searchKnex.raw(
              '(_text_cd_rank/(_text_cd_rank + 1)) AS text_cd_rank'
            )
          )
          .from(
            this.searchKnex
              .select(
                'id',
                'num_views',
                'title_orig', // 'title',
                'created_at',
                'last_read_at', // -- title, slug,
                this.searchKnex.raw(
                  'percent_rank() OVER (ORDER BY num_views NULLS FIRST) AS views_rank'
                ),
                this.searchKnex.raw(
                  'ts_rank(title_jieba_ts, query) AS title_ts_rank'
                ),
                this.searchKnex.raw(
                  'COALESCE(ts_rank(summary_jieba_ts, query, 1), 0) ::float AS summary_ts_rank'
                ),
                this.searchKnex.raw(
                  'ts_rank_cd(text_jieba_ts, query, 4) AS _text_cd_rank'
                )
              )
              .from('search_index.article')
              .crossJoin(
                this.searchKnex.raw("plainto_tsquery('jiebacfg', ?) query", key)
              )
              .whereNotIn('id', articleIds)
              .whereIn('state', [ARTICLE_STATE.active])
              .andWhere('author_state', 'NOT IN', [
                // USER_STATE.active
                USER_STATE.archived,
                USER_STATE.banned,
              ])
              .andWhere('author_id', 'NOT IN', blockedIds)
              .andWhereRaw(
                `(query @@ title_jieba_ts OR query @@ summary_jieba_ts OR query @@ text_jieba_ts)`
              )
              .as('t0')
          )
          .as('t1')
      )
      .where('title_ts_rank', '>=', SEARCH_TITLE_RANK_THRESHOLD)
      .orWhere('text_cd_rank', '>=', SEARCH_DEFAULT_TEXT_RANK_THRESHOLD)

    const records = await this.searchKnex
      .select(
        '*',
        this.searchKnex.raw(
          '(? * views_rank + ? * title_ts_rank + ? * summary_ts_rank + ? * text_cd_rank) AS score',
          [c0, c1, c2, c3]
        ),
        this.searchKnex.raw('COUNT(id) OVER() ::int AS total_count')
      )
      .from(baseQuery.as('base'))
      .orderByRaw('score DESC NULLS LAST')
      .orderByRaw('num_views DESC NULLS LAST')
      .orderByRaw('id DESC')
      .modify((builder: Knex.QueryBuilder) => {
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })

    const nodes = await this.models.articleIdLoader.loadMany(
      records.map((item: { id: string }) => item.id).filter(Boolean)
    )

    const totalCount = records.length === 0 ? 0 : +records[0].totalCount

    logger.debug(
      `articleService::searchV2 searchKnex instance got ${nodes.length} nodes from: ${totalCount} total:`,
      { key, keyOriginal, baseQuery: baseQuery.toString() },
      { sample: records?.slice(0, 3) }
    )

    return { nodes, totalCount }
  }

  public searchV3 = async ({
    key: keyOriginal,
    take = 10,
    skip = 0,
    quicksearch,
    filter,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    filter?: {
      authorId?: string
    }
    exclude?: {
      blocked?: boolean
    }
    coefficients?: string
    quicksearch?: boolean
  }): Promise<{ nodes: Article[]; totalCount: number }> => {
    if (quicksearch) {
      return this.quicksearch({ key: keyOriginal, take, skip, filter })
    }
    const key = await normalizeSearchKey(keyOriginal)
    try {
      const u = new URL(`${environment.tsQiServerUrl}/api/articles/search`)
      u.searchParams.set('q', key?.trim())
      u.searchParams.set('fields', 'id,title,summary')
      if (take) {
        u.searchParams.set('limit', `${take}`)
      }
      if (skip) {
        u.searchParams.set('offset', `${skip}`)
      }
      logger.info(`searchV3 fetching from: "%s"`, u.toString())
      const {
        nodes: records,
        total: totalCount,
        query,
      } = (await fetch(u).then((res) => res.json())) as {
        nodes: Array<{ id: string }>
        total: number
        query: string
      }
      logger.info(
        `searchV3 found ${records?.length}/${totalCount} results from tsquery: '${query}': sample: %j`,
        records[0]
      )

      const nodes = await this.models.articleIdLoader.loadMany(
        records.map((item: { id: string }) => `${item.id}`).filter(Boolean)
      )

      return { nodes, totalCount }
    } catch (err) {
      logger.error(`searchV3 ERROR:`, err)
      return { nodes: [], totalCount: 0 }
    }
  }

  private quicksearch = async ({
    key,
    take,
    skip,
    filter,
  }: {
    key: string
    take?: number
    skip?: number
    filter?: {
      authorId?: string
    }
  }): Promise<{ nodes: Article[]; totalCount: number }> => {
    const keySimplified = simplecc(key, 't2s')
    const keyTraditional = simplecc(key, 's2t')
    // const systemService = new SystemService(this.connections)
    // const spamThreshold = await systemService.getSpamThreshold()
    const q = this.knexRO('article')
      .select('*', this.knexRO.raw('COUNT(1) OVER() ::int AS total_count'))
      .whereIn(
        'id',
        this.knexRO
          .select('article_id')
          .whereNotIn(
            'article_id',
            this.knexRO('article_recommend_setting')
              .where({ inSearch: false })
              .select('articleId')
          )
          .where(function () {
            if (filter && filter.authorId) {
              this.where({ authorId: filter.authorId })
            }
            this.whereILike('title', `%${key}%`)
              .orWhereILike('title', `%${keyTraditional}%`)
              .orWhereILike('title', `%${keySimplified}%`)
          })
          .from('article_version_newest')
      )
      .where({ state: ARTICLE_STATE.active })
      // .modify(excludeSpam, spamThreshold)
      .orderBy('id', 'desc')
      .modify((builder: Knex.QueryBuilder) => {
        if (filter && filter.authorId) {
          builder.where({ authorId: filter.authorId })
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
      })
    const records = await q

    const totalCount = +(records?.[0]?.totalCount ?? 0)
    return { nodes: records as Article[], totalCount }
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

  private updateArticleConnections = async ({
    articleId,
    connections,
  }: {
    articleId: string
    connections: string[]
  }) => {
    const oldIds = (
      await this.findConnections({
        entranceId: articleId,
      })
    ).map(({ articleId: id }: { articleId: string }) => id)
    const newIds = uniq(connections)

    // do nothing if no change
    if (isEqual(oldIds, newIds)) {
      return
    }

    const newIdsToAdd = difference(newIds, oldIds)
    const oldIdsToDelete = difference(oldIds, newIds)

    // only validate new-added articles
    if (newIdsToAdd.length) {
      if (
        newIds.length > MAX_ARTICLES_PER_CONNECTION_LIMIT &&
        newIds.length >= oldIds.length
      ) {
        throw new ArticleCollectionReachLimitError(
          `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in connection`
        )
      }
      await Promise.all(
        newIdsToAdd.map(async (id) => {
          const collectedArticle = await this.models.findUnique({
            table: 'article',
            where: { id: articleId },
          })

          if (!collectedArticle) {
            throw new ArticleNotFoundError(`Cannot find article ${id}`)
          }

          if (collectedArticle.state !== ARTICLE_STATE.active) {
            throw new ForbiddenError(`Article ${id} cannot be collected.`)
          }
        })
      )
    }

    interface Item {
      entranceId: string
      articleId: string
      order: number
    }
    const addItems: Item[] = []
    const updateItems: Item[] = []

    // gather data
    newIds.forEach((id: string, index: number) => {
      const isNew = newIdsToAdd.includes(id)
      if (isNew) {
        addItems.push({ entranceId: articleId, articleId: id, order: index })
      }
      if (!isNew && index !== oldIds.indexOf(id)) {
        updateItems.push({ entranceId: articleId, articleId: id, order: index })
      }
    })

    await Promise.all([
      ...addItems.map((item) =>
        this.models.create({
          table: 'article_connection',
          data: {
            ...item,
          },
        })
      ),
      ...updateItems.map((item) =>
        this.models.update({
          table: 'article_connection',
          where: { entranceId: item.entranceId, articleId: item.articleId },
          data: { order: item.order },
        })
      ),
    ])

    // delete unwanted
    await this.models.deleteMany({
      table: 'article_connection',
      where: { entranceId: articleId },
      whereIn: ['article_id', oldIdsToDelete],
    })

    // trigger notifications
    const article = await this.models.articleIdLoader.load(articleId)
    const notificationService = new NotificationService(this.connections)
    newIdsToAdd.forEach(async (id) => {
      const targetConnection = await this.models.findUnique({
        table: 'article',
        where: { id },
      })
      if (targetConnection) {
        notificationService.trigger({
          event: NOTICE_TYPE.article_new_collected,
          recipientId: targetConnection.authorId,
          actorId: article.authorId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: targetConnection,
            },
            {
              type: 'collection',
              entityTable: 'article',
              entity: article,
            },
          ],
        })
      }
    })
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
    language: string,
    actorId?: string
  ) => {
    // paywalled content
    const { id, articleId } = articleVersion
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

    const {
      title: originTitle,
      summary: originSummary,
      language: storedLanguage,
      contentId,
    } = articleVersion
    const { content: originContent } =
      await this.models.articleContentIdLoader.load(contentId)

    // it's same as original language
    if (language === storedLanguage) {
      return {
        content: isPaywalledContent ? '' : originContent,
        title: originTitle,
        summary: originSummary,
        language,
      }
    }

    // get translation
    const translation = await this.models.findFirst({
      table: 'article_translation',
      where: { articleId, language, articleVersionId: id },
    })

    if (translation) {
      return {
        ...translation,
        content: isPaywalledContent ? '' : translation.content,
      }
    }

    const gcp = new GCP()

    // or translate and store to db
    const [title, content, summary] = await Promise.all(
      [originTitle, originContent, originSummary].map((text) =>
        gcp.translate({
          content: text,
          target: language,
        })
      )
    )

    if (title && content) {
      const data = {
        articleId,
        title,
        content,
        summary,
        language,
        articleVersionId: id,
      }
      await this.models.upsert({
        table: 'article_translation',
        where: { articleId, language, articleVersionId: id },
        create: data,
        update: data,
      })

      // translate tags
      const tagIds = await this.findTagIds({ id: articleId })
      if (tagIds && tagIds.length > 0) {
        try {
          const tags = await this.models.tagIdLoader.loadMany(tagIds)
          await Promise.all(
            tags.map(async (tag) => {
              if (tag instanceof Error) {
                return
              }
              const translatedTag = await gcp.translate({
                content: tag.content,
                target: language,
              })
              const tagData = {
                tagId: tag.id,
                content: translatedTag ?? '',
                language,
              }
              await this.models.upsert({
                table: 'tag_translation',
                where: { tagId: tag.id },
                create: tagData,
                update: tagData,
              })
            })
          )
        } catch (error) {
          logger.error(error)
        }
      }

      await invalidateFQC({
        node: { type: NODE_TYPES.Article, id: articleId },
        redis: this.redis,
      })

      return {
        title,
        content: isPaywalledContent ? '' : content,
        summary,
        language,
      }
    } else {
      return null
    }
  }

  /*********************************
   *                               *
   *        Spam detection         *
   *                               *
   *********************************/

  public detectSpam = async (
    id: string,
    spamDetector?: SpamDetector,
    callback?: (score: number | null) => Promise<void>
  ) => {
    const detector = spamDetector ?? new SpamDetector()
    const { title, summary, summaryCustomized } =
      await this.loadLatestArticleVersion(id)
    const content = await this.loadLatestArticleContent(id)
    await this._detectSpam(
      { id, title, content, summary: summaryCustomized ? summary : undefined },
      detector,
      callback
    )
  }

  private _detectSpam = async (
    {
      id,
      title,
      content,
      summary,
    }: { id: string; title: string; content: string; summary?: string },
    spamDetector?: SpamDetector,
    callback?: (score: number | null) => Promise<void>
  ) => {
    const detector = spamDetector ?? new SpamDetector()
    const text = summary
      ? title + '\n' + summary + '\n' + content
      : title + '\n' + content
    const score = await detector.detect(text)
    logger.info(`Spam detection for article ${id}: ${score}`)

    if (score) {
      await this.models.update({
        table: 'article',
        where: { id },
        data: { spamScore: score },
      })
    }

    callback?.(score)
  }

  private postArticleCreation = async ({
    articleId,
    articleVersionId,
    title,
    content,
    summary,
  }: {
    articleId: string
    articleVersionId: string
    title: string
    content: string
    summary?: string
  }) => {
    this._detectSpam(
      { id: articleId, title, content, summary },
      undefined,
      async (score) => {
        const systemService = new SystemService(this.connections)
        const channelService = new ChannelService(this.connections)
        const spamThreshold = await systemService.getSpamThreshold()
        const isSpam = spamThreshold && score && score >= spamThreshold

        if (isSpam) {
          return
        }

        // infer article channels if not spam
        channelService.classifyArticlesChannels({ ids: [articleId] })

        // trigger IPFS publication
        aws.sqsSendMessage({
          messageBody: { articleId, articleVersionId },
          queueUrl: QUEUE_URL.ipfsPublication,
        })
      }
    )
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

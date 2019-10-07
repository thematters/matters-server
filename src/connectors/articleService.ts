import slugify from '@matters/slugify'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  BATCH_SIZE,
  TRANSACTION_PURPOSE,
  USER_ACTION
} from 'common/enums'
import { environment } from 'common/environment'
import { ArticleNotFoundError, ServerError } from 'common/errors'
import logger from 'common/logger'
import {
  countWords,
  makeSummary,
  outputCleanHTML,
  removeEmpty,
  stripHtml
} from 'common/utils'
import { BaseService, ipfs, SystemService, UserService } from 'connectors'
import { GQLSearchInput, ItemData } from 'definitions'

export class ArticleService extends BaseService {
  ipfs: typeof ipfs

  constructor() {
    super('article')
    this.ipfs = ipfs

    this.dataloader = new DataLoader(async (ids: string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      return result
    })

    this.uuidLoader = new DataLoader(async (uuids: string[]) => {
      const result = await this.baseFindByUUIDs(uuids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      return result
    })
  }

  /**
   * Create a new article item.
   */
  create = async (articleData: ItemData & { content: string }) => {
    // craete article
    const article = await this.baseCreate({
      uuid: v4(),
      wordCount: countWords(articleData.content),
      ...articleData
    })
    return article
  }

  /**
   * Publish an article to IPFS
   */
  publish = async ({
    authorId,
    title,
    cover,
    summary: draftSummary,
    content
  }: {
    [key: string]: string
  }) => {
    const userService = new UserService()
    const systemService = new SystemService()

    // prepare metadata
    const author = await userService.dataloader.load(authorId)
    const now = new Date()
    const summary = draftSummary || makeSummary(content)
    const userImg =
      author.avatar && (await systemService.findAssetUrl(author.avatar))
    const articleImg = cover && (await systemService.findAssetUrl(cover))

    // add content to ipfs
    const html = this.ipfs.makeHTML({
      title,
      author: { userName: author.userName, displayName: author.displayName },
      summary,
      content: outputCleanHTML(content),
      publishedAt: now
    })
    const dataHash = await this.ipfs.addHTML(html)

    // add meta data to ipfs
    const mediaObj: { [key: string]: any } = {
      '@context': 'http://schema.org',
      '@type': 'Article',
      '@id': `ipfs://ipfs/${dataHash}`,
      author: {
        name: author.userName,
        image: userImg,
        url: `https://matters.news/@${author.userName}`,
        description: author.description
      },
      dateCreated: now.toISOString(),
      description: summary,
      image: articleImg
    }

    // add cover to ipfs
    // TODO: check data type for cover
    if (articleImg) {
      const coverData = await this.ipfs.getDataAsFile(articleImg, '/')
      if (coverData && coverData.content) {
        const [{ hash }] = await this.ipfs.client.add(coverData.content, {
          pin: true
        })
        mediaObj.cover = { '/': hash }
      }
    }

    const mediaObjectCleaned = removeEmpty(mediaObj)

    const cid = await this.ipfs.client.dag.put(mediaObjectCleaned, {
      format: 'dag-cbor',
      pin: true,
      hashAlg: 'sha2-256'
    })
    const mediaHash = cid.toBaseEncodedString()

    // edit db record
    const article = await this.create({
      authorId,
      title,
      slug: slugify(title),
      summary,
      content,
      cover,
      dataHash,
      mediaHash,
      state: ARTICLE_STATE.active
    })

    return article
  }

  /**
   * Archive article
   */
  archive = async (id: string) => {
    // update search
    try {
      await this.es.client.update({
        index: this.table,
        type: this.table,
        id,
        body: {
          doc: { state: ARTICLE_STATE.archived }
        }
      })
    } catch (e) {
      logger.error(e)
    }

    return this.baseUpdate(id, {
      state: ARTICLE_STATE.archived,
      sticky: false,
      updatedAt: new Date()
    })
  }

  /**
   *  Find articles by a given author id (user).
   */
  findByAuthor = async (authorId: string, filter = {}, stickyFirst = false) => {
    const query = this.knex
      .select()
      .from(this.table)
      .where({ authorId, ...filter })

    if (stickyFirst === true) {
      query.orderBy([
        { column: 'sticky', order: 'desc' },
        { column: 'id', order: 'desc' }
      ])
    } else {
      query.orderBy('id', 'desc')
    }

    return query
  }

  /**
   * Find article by media hash
   */
  findByMediaHash = async (mediaHash: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({ mediaHash })
      .first()

  /**
   * Find article by which set as sticky.
   */
  findBySticky = async (authorId: string, sticky: boolean) =>
    this.knex
      .select('id')
      .from(this.table)
      .where({ authorId, sticky: true })

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (
    authorId: string,
    activeOnly: boolean = true
  ): Promise<number> => {
    let qs = this.knex(this.table)
      .where({ authorId })
      .count()
      .first()

    if (activeOnly) {
      qs = qs.where({ state: ARTICLE_STATE.active })
    }

    const result = await qs

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Sum up word counts by a given authorId (user).
   */
  sumWordCountByAuthor = async (
    authorId: string,
    activeOnly: boolean = true
  ): Promise<number> => {
    let query = this.knex(this.table)
      .sum('word_count')
      .where({ authorId })
      .first()

    if (activeOnly) {
      query = query.where({ state: ARTICLE_STATE.active })
    }

    const result = await query
    return (
      parseInt(result && result.sum ? (result.sum as string) : '0', 10) || 0
    )
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  /**
   * Dump all data to ES (Currently only used in test)
   */
  initSearch = async () => {
    const articles = await this.knex(this.table).select(
      'content',
      'title',
      'id'
    )

    return this.es.indexManyItems({
      index: this.table,
      items: articles.map(
        (article: { content: string; title: string; id: string }) => ({
          ...article,
          content: stripHtml(article.content)
        })
      )
    })
  }

  addToSearch = async ({
    id,
    title,
    content,
    tags
  }: {
    [key: string]: string
  }) => {
    const result = await this.es.indexItems({
      index: this.table,
      type: this.table,
      items: [
        {
          id,
          title,
          content: stripHtml(content),
          tags
        }
      ]
    })
    return result
  }

  search = async ({
    key,
    first = 20,
    offset,
    oss = false
  }: GQLSearchInput & { offset: number; oss?: boolean }) => {
    // for local dev
    // if (environment.env === 'development') {
    //   return this.knex(this.table)
    //     .where('title', 'like', `%${key}%`)
    //     .offset(offset)
    //     .limit(first)
    // }

    const body = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 'AUTO',
        fields: [
          'title^10',
          'title.synonyms^5',
          'content^2',
          'content.synonyms'
        ],
        type: 'most_fields'
      })
      .from(offset)
      .size(first)

    // only return active if not in oss
    if (!oss) {
      body.notFilter('term', { state: ARTICLE_STATE.archived })
    }

    try {
      const result = await this.es.client.search({
        index: this.table,
        type: this.table,
        body: body.build()
      })
      const { hits } = result
      const ids = hits.hits.map(({ _id }) => _id)
      const nodes = await this.baseFindByIds(ids, this.table)

      return {
        nodes,
        totalCount: hits.total
      }
    } catch (err) {
      logger.error(err)
      throw new ServerError('article search failed')
    }
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/
  /**
   * Find Many
   */
  recommendHottest = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    // use view when oss for real time update
    // use materialized in other cases
    const table = oss
      ? 'article_activity_view'
      : 'article_activity_materialized'

    let qs = this.knex(`${table} as view`)
      .select('view.id', 'setting.in_hottest', 'article.*')
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .leftJoin('article', 'view.id', 'article.id')
      .orderByRaw('latest_activity DESC NULLS LAST')
      .orderBy('view.id', 'desc')
      .where({ 'article.state': ARTICLE_STATE.active, ...where })
      .limit(limit)
      .offset(offset)

    if (!oss) {
      qs = qs.andWhere(function() {
        this.where({ inHottest: true }).orWhereNull('in_hottest')
      })
    }

    const result = await qs
    return result
  }

  recommendNewest = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    let qs = this.knex('article')
      .select('article.*', 'setting.in_newest')
      .leftJoin(
        'article_recommend_setting as setting',
        'article.id',
        'setting.article_id'
      )
      .orderBy('id', 'desc')
      .where(where)
      .limit(limit)
      .offset(offset)

    if (!oss) {
      qs = qs.andWhere(function() {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      })
    }

    const result = await qs
    return result
  }

  recommendToday = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {}
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
  }) =>
    this.knex('article')
      .select(
        'article.*',
        'c.updated_at as chose_at',
        'c.cover as oss_cover',
        'c.title as oss_title',
        'c.summary as oss_summary'
      )
      .join('matters_today as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where(where)
      .offset(offset)
      .limit(limit)

  recommendIcymi = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {}
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
  }) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where(where)
      .offset(offset)
      .limit(limit)

  recommendTopics = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    const table = oss ? 'article_count_view' : 'article_count_materialized'

    return this.knex(`${table} as view`)
      .select('view.*', 'article.state', 'article.public', 'article.sticky')
      .join('article', 'view.id', 'article.id')
      .orderByRaw('topic_score DESC NULLS LAST')
      .orderBy('view.id', 'desc')
      .where({ 'article.state': ARTICLE_STATE.active, ...where })
      .limit(limit)
      .offset(offset)
  }

  related = async ({ id, size }: { id: string; size: number }) => {
    // skip if in test
    if (['test', 'development'].includes(environment.env)) {
      return []
    }

    // get vector score
    const scoreResult = await this.es.client.get({
      index: this.table,
      type: this.table,
      id
    })

    const factorString = _.get(scoreResult, '_source.factor')

    // return empty list if we don't have any score
    if (!factorString) {
      return []
    }

    // recommend with vector score
    const factor = factorString
      .split(' ')
      .map((s: string) => parseFloat(s.split('|')[1]))

    const q = '*'
    const body = bodybuilder()
      .query('function_score', {
        query: {
          query_string: {
            query: q
          }
        },
        script_score: {
          script: {
            inline: 'payload_vector_score',
            lang: 'native',
            params: {
              field: 'factor',
              vector: factor,
              cosine: true
            }
          }
        },
        boost_mode: 'replace'
      })
      .notFilter('ids', { values: [id] })
      .size(size)
      .build()

    const relatedResult = await this.es.client.search({
      index: this.table,
      type: this.table,
      body
    })
    // add recommendation
    return relatedResult.hits.hits.map(hit => ({ ...hit, id: hit._id }))
  }

  /**
   * Find One
   */
  findRecommendToday = async (articleId: string) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at', 'c.cover as todayCover')
      .join('matters_today as c', 'c.article_id', 'article.id')
      .where({ articleId })
      .first()

  findRecommendIcymi = async (articleId: string) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where({ articleId })
      .first()

  findRecommendHottest = async (articleId: string) =>
    this.knex('article_activity_materialized')
      .where({ id: articleId })
      .first()

  findRecommendNewset = async (articleId: string) =>
    this.knex(this.table)
      .where({ id: articleId })
      .first()

  findRecommendTopic = async (articleId: string) =>
    this.knex('article_count_materialized')
      .where({ id: articleId })
      .first()

  /**
   * Count
   */
  countRecommendToday = async (where: { [key: string]: any } = {}) => {
    const result = await this.knex('article')
      .join('matters_today as c', 'c.article_id', 'article.id')
      .where(where)
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendIcymi = async (where: { [key: string]: any } = {}) => {
    const result = await this.knex('article')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .where(where)
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendHottest = async ({
    where = {},
    oss = false
  }: {
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    // use view when oss for real time update
    // use materialized in other cases
    const table = oss
      ? 'article_activity_view'
      : 'article_activity_materialized'

    let qs = this.knex(`${table} as view`)
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .join('article', 'article.id', 'view.id')
      .where(where)
      .count()
      .first()

    if (!oss) {
      qs = qs.andWhere(function() {
        this.where({ inHottest: true }).orWhereNull('in_hottest')
      })
    }
    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendNewest = async ({
    where = {},
    oss = false
  }: {
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    let qs = this.knex('article')
      .leftJoin(
        'article_recommend_setting as setting',
        'article.id',
        'setting.article_id'
      )
      .where(where)
      .count()
      .first()

    if (!oss) {
      qs = qs.andWhere(function() {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      })
    }

    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Boost & Score
   */
  findBoost = async (articleId: string) => {
    const articleBoost = await this.knex('article_boost')
      .select()
      .where({ articleId })
      .first()

    if (!articleBoost) {
      return 1
    }

    return articleBoost.boost
  }

  setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate({
      where: { articleId: id },
      data: { articleId: id, boost, updatedAt: new Date() },
      table: 'article_boost'
    })

  findScore = async (articleId: string) => {
    const article = await this.knex('article_count_view')
      .select()
      .where({ id: articleId })
      .first()
    return article.topicScore || 0
  }

  /**
   * Find or Update recommendation
   */
  addRecommendToday = async (articleId: string) =>
    this.baseFindOrCreate({
      where: { articleId },
      data: { articleId },
      table: 'matters_today'
    })

  updateRecommendToday = async (
    articleId: string,
    data: { cover?: number; title?: string; summary?: string }
  ) =>
    this.baseUpdateOrCreate({
      where: { articleId },
      data,
      table: 'matters_today'
    })

  removeRecommendToday = async (articleId: string) =>
    this.knex('matters_today')
      .where({ articleId })
      .del()

  addRecommendIcymi = async (articleId: string) =>
    this.baseFindOrCreate({
      where: { articleId },
      data: { articleId },
      table: 'matters_choice'
    })

  removeRecommendIcymi = async (articleId: string) =>
    this.knex('matters_choice')
      .where({ articleId })
      .del()

  findRecommendSetting = async (articleId: string) => {
    const setting = await this.knex('article_recommend_setting')
      .select()
      .where({ articleId })
      .first()

    if (!setting) {
      return { inHottest: true, inNewest: true }
    }

    return setting
  }

  updateRecommendSetting = async ({
    articleId,
    data
  }: {
    articleId: string
    data: { [key in 'inHottest' | 'inNewest']?: boolean }
  }) =>
    this.baseUpdateOrCreate({
      where: { articleId },
      data: { ...data, articleId },
      table: 'article_recommend_setting'
    })

  /*********************************
   *                               *
   *          Appreciaton          *
   *                               *
   *********************************/
  /**
   * Sum total appreciaton by a given article id.
   */
  sumAppreciation = async (articleId: string): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .whereIn(
        ['reference_id', 'purpose'],
        [
          [articleId, TRANSACTION_PURPOSE.appreciate],
          [articleId, TRANSACTION_PURPOSE.appreciateSubsidy]
        ]
      )
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  countAppreciation = async (referenceId: string): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({
        referenceId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .count()
      .first()
    return parseInt(result.count || '0', 10)
  }

  /**
   * Count total appreciaton by a given article id and user ids.
   */
  countAppreciationByUserIds = async ({
    articleId,
    userIds
  }: {
    articleId: string
    userIds: string[]
  }): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .whereIn('senderId', userIds)
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  /**
   * Find an article's appreciations by a given articleId.
   */
  findTransactions = async ({
    referenceId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    referenceId: string
    limit?: number
    offset?: number
  }): Promise<any[]> => {
    const result = await this.knex('transaction')
      .select('reference_id', 'sender_id')
      .where({
        referenceId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .groupBy('sender_id', 'reference_id')
      .sum('amount as amount')
      .max('created_at as created_at')
      .limit(limit)
      .offset(offset)

    return result
  }

  appreciateLeftByUser = async ({
    articleId,
    userId
  }: {
    articleId: string
    userId: string
  }): Promise<number> => {
    const appreciations = await this.knex('transaction')
      .select()
      .where({
        senderId: userId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .sum('amount as total')
    const total = _.get(appreciations, '0.total', 0)

    return Math.max(ARTICLE_APPRECIATE_LIMIT - total, 0)
  }

  hasAppreciate = async ({
    userId: senderId,
    articleId
  }: {
    userId: string
    articleId: string
  }): Promise<boolean> => {
    const result = await this.knex('transaction')
      .select()
      .where({
        senderId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
    return result.length > 0
  }

  /**
   * User appreciate an article
   */
  appreciate = async ({
    articleId,
    senderId,
    recipientId,
    amount,
    type
  }: {
    articleId: string
    senderId: string
    recipientId: string
    amount: number
    type: string
  }): Promise<any> => {
    const appreciation = {
      senderId,
      recipientId,
      referenceId: articleId,
      purpose: TRANSACTION_PURPOSE.appreciate,
      type
    }

    // find transaction within 1 minutes and bundle
    const bundle = await this.knex('transaction')
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
      result = await this.knex('transaction')
        .where({ id: bundle.id })
        .update({
          amount: bundle.amount + amount,
          createdAt: this.knex.fn.now()
        })
    } else {
      const uuid = v4()
      result = await this.knex('transaction')
        .insert({
          ...appreciation,
          uuid,
          amount
        })
        .into('transaction')
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
   * Find tages by a given article id.
   */
  findTagIds = async ({
    id: articleId
  }: {
    id: string
  }): Promise<any | null> => {
    const result = await this.knex
      .select('tag_id')
      .from('article_tag')
      .where({ articleId })

    return result.map(({ tagId }: { tagId: string }) => tagId)
  }

  /*********************************
   *                               *
   *          Subscription         *
   *                               *
   *********************************/
  /**
   * Find an article's subscribers by a given targetId (article).
   */
  findSubscriptions = async ({
    id: targetId,
    limit,
    offset = 0
  }: {
    id: string
    limit?: number
    offset?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_article')
      .where({ targetId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')
      .offset(offset)

    return limit ? query.limit(limit) : query
  }

  countSubscriptions = async (id: string) => {
    const result = await this.knex('action_article')
      .where({ targetId: id, action: USER_ACTION.subscribe })
      .countDistinct('user_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  isSubscribed = async ({
    userId,
    targetId
  }: {
    userId: string
    targetId: string
  }): Promise<boolean> => {
    const result = await this.knex
      .select()
      .from('action_article')
      .where({ userId, targetId, action: USER_ACTION.subscribe })
    return result.length > 0
  }

  /**
   * User subscribe an article
   */
  subscribe = async (targetId: string, userId: string): Promise<any[]> => {
    const data = {
      targetId,
      userId,
      action: USER_ACTION.subscribe
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_article'
    })
  }

  /**
   * User unsubscribe an article
   */
  unsubscribe = async (targetId: string, userId: string): Promise<any[]> =>
    this.knex
      .from('action_article')
      .where({
        targetId,
        userId,
        action: USER_ACTION.subscribe
      })
      .del()

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  /**
   * User read an article
   */
  read = async ({
    articleId,
    userId,
    ip
  }: {
    articleId: string
    userId?: string | null
    ip?: string
  }): Promise<any[]> =>
    this.baseCreate(
      {
        uuid: v4(),
        articleId,
        userId,
        ip
      },
      'article_read'
    )

  /*********************************
   *                               *
   *             Report            *
   *                               *
   *********************************/
  /**
   * User report an article
   */
  report = async ({
    articleId,
    userId,
    category,
    description,
    contact,
    assetIds
  }: {
    articleId?: string
    userId?: string | null
    category: string
    description?: string
    contact?: string
    assetIds?: string[]
  }): Promise<void> => {
    // create report
    const { id: reportId } = await this.baseCreate(
      {
        userId,
        articleId,
        category,
        description,
        contact
      },
      'report'
    )
    // create report assets
    if (!assetIds || assetIds.length <= 0) {
      return
    }
    const reportAssets = assetIds.map(assetId => ({
      reportId,
      assetId
    }))
    await this.baseBatchCreate(reportAssets, 'report_asset')
  }

  /*********************************
   *                               *
   *          Collection           *
   *                               *
   *********************************/

  /**
   * Create a collection for article
   */
  createCollection = async ({
    entranceId,
    articleIds
  }: {
    articleIds: string[]
    entranceId: string
  }) => {
    const items = articleIds.map((articleId, index) => ({
      entranceId,
      articleId,
      order: index,
      createdAt: new Date(),
      updatedAt: new Date()
    }))
    return this.baseBatchCreate(items, 'collection')
  }

  /**
   * Insert a single record to collection for article
   */
  insertCollection = async ({
    entranceId,
    articleId,
    order
  }: {
    entranceId: string
    articleId: string
    order: number
  }) =>
    this.baseCreate(
      {
        entranceId,
        articleId,
        order,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      'collection'
    )

  /**
   * Update a collection order by given entrance id and article id.
   */
  updateCollectionOrder = async ({
    entranceId,
    articleId,
    order
  }: {
    entranceId: string
    articleId: string
    order: number
  }) => {
    const [updatedItem] = await this.knex('collection')
      .where({ entranceId, articleId })
      .update({ order })
      .returning('*')
    return updatedItem
  }

  /**
   * Delete a collection for article
   */
  deleteCollection = async ({ entranceId }: { entranceId: string }) => {
    const table = 'collection'
    const items = await this.knex('collection')
      .select('id')
      .where({ entranceId })
    const ids = items.map(({ id }: { id: string }) => id)

    return this.baseBatchDelete(ids, table)
  }

  /**
   * Delete record of a collection by given entrance id and an array of article id.
   */
  deleteCollectionByArticleIds = async ({
    entranceId,
    articleIds
  }: {
    entranceId: string
    articleIds: string[]
  }) =>
    this.knex('collection')
      .where({ entranceId })
      .whereIn('articleId', articleIds)
      .del()

  /**
   * Find single collection by given entrance id and article id.
   */
  findCollection = async ({
    entranceId,
    articleId
  }: {
    entranceId: string | number
    articleId: string
  }) =>
    this.knex('collection')
      .select()
      .where({ entranceId, articleId })
      .first()

  /**
   * Find an article's collections by a given article id.
   */
  findCollections = async ({
    entranceId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    entranceId: string
    limit?: number | null
    offset?: number
  }) => {
    const query = this.knex('collection')
      .select('article_id')
      .where({ entranceId })
      .offset(offset)
      .orderBy('order', 'asc')

    if (limit) {
      query.limit(limit)
    }
    return query
  }

  /**
   * Find an article is collected by which articles.
   */
  findCollectedBy = async ({
    articleId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    articleId: string
    limit?: number
    offset?: number
  }) =>
    this.knex('collection')
      .select('entrance_id')
      .where({ articleId })
      .limit(limit)
      .offset(offset)

  /**
   * Count collections by a given article id.
   */
  countCollections = async (id: string) => {
    const result = await this.knex('collection')
      .where({ entranceId: id })
      .countDistinct('article_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count an article is collect by how many articles.
   */
  countCollectedBy = async (id: string) => {
    const result = await this.knex('collection')
      .where({ articleId: id })
      .countDistinct('entrance_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count an article is collected by how many active articles.
   */
  countActiveCollectedBy = async (id: string) => {
    const query = this.knex('collection')
      .rightJoin('article', 'collection.entrance_id', 'article.id')
      .where({
        'collection.article_id': id,
        'article.state': ARTICLE_STATE.active
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

  makeResponseQuery = ({
    id,
    order,
    state,
    fields = '*',
    articleOnly = false
  }: {
    id: string
    order: string
    state?: string
    fields?: string
    articleOnly?: boolean
  }) =>
    this.knex.select(fields).from((wrapper: any) => {
      wrapper
        .select(
          this.knex.raw('row_number() over (order by created_at) as seq, *')
        )
        .from((knex: any) => {
          const source = knex.union((operator: any) => {
            operator
              .select(
                this.knex.raw(
                  "'Article' as type, entrance_id as entity_id, collection.created_at"
                )
              )
              .from('collection')
              .rightJoin('article', 'collection.entrance_id', 'article.id')
              .where({ 'collection.article_id': id, 'article.state': state })
          })

          if (articleOnly !== true) {
            source.union((operator: any) => {
              operator
                .select(
                  this.knex.raw(
                    "'Comment' as type, id as entity_id, created_at"
                  )
                )
                .from('comment')
                .where({ articleId: id, parentCommentId: null })
            })
          }

          source.as('base_sources')
          return source
        })
        .orderBy('created_at', order)
        .as('sources')
    })

  makeResponseFilterQuery = ({
    id,
    entityId,
    order,
    state,
    articleOnly
  }: {
    id: string
    entityId: string
    order: string
    state?: string
    articleOnly?: boolean
  }) => {
    const query = this.makeResponseQuery({
      id,
      order,
      state,
      fields: 'seq',
      articleOnly
    })
    return query.where({ entityId }).first()
  }

  findResponses = ({
    id,
    order = 'desc',
    state = 'active',
    after,
    before,
    first,
    includeAfter = false,
    includeBefore = false,
    articleOnly = false
  }: {
    id: string
    order?: string
    state?: string
    after?: any
    before?: any
    first?: number
    includeAfter?: boolean
    includeBefore?: boolean
    articleOnly?: boolean
  }) => {
    const query = this.makeResponseQuery({ id, order, state, articleOnly })
    if (after) {
      const subQuery = this.makeResponseFilterQuery({
        id,
        order,
        state,
        entityId: after,
        articleOnly
      })
      if (includeAfter) {
        query.andWhere('seq', order === 'asc' ? '>=' : '<=', subQuery)
      } else {
        query.andWhere('seq', order === 'asc' ? '>' : '<', subQuery)
      }
    }
    if (before) {
      const subQuery = this.makeResponseFilterQuery({
        id,
        order,
        state,
        entityId: before
      })
      if (includeBefore) {
        query.andWhere('seq', order === 'asc' ? '<=' : '>=', subQuery)
      } else {
        query.andWhere('seq', order === 'asc' ? '<' : '>', subQuery)
      }
    }
    if (first) {
      query.limit(first)
    }
    return query
  }

  responseRange = async ({
    id,
    order,
    state
  }: {
    id: string
    order: string
    state: string
  }) => {
    const query = this.makeResponseQuery({ id, order, state, fields: '' })
    const { count, max, min } = await query
      .max('seq')
      .min('seq')
      .count()
      .first()
    return {
      count: parseInt(count, 10),
      max: parseInt(max, 10),
      min: parseInt(min, 10)
    }
  }

  countByResponses = async ({
    id,
    order = 'desc',
    state = 'active'
  }: {
    id: string
    order?: string
    state?: string
  }) => {
    const query = this.makeResponseQuery({ id, order, state, fields: '' })
    const { count } = await query.count().first()
    return parseInt(count, 10)
  }
}

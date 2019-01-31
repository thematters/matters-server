import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { v4 } from 'uuid'
import slugify from '@matters/slugify'
import _ from 'lodash'

import {
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  BATCH_SIZE,
  USER_ACTION,
  TRANSACTION_PURPOSE
} from 'common/enums'
import { ItemData, GQLSearchInput } from 'definitions'
import { ipfs } from 'connectors/ipfs'
import { stripHtml, countWords, makeSummary } from 'common/utils'
import { ArticleNotFoundError, ServerError } from 'common/errors'

import { BaseService } from './baseService'
import { UserService } from './userService'
import { SystemService } from './systemService'
import logger from 'common/logger'

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
    upstreamId,
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
    const summary = draftSummary || makeSummary(stripHtml(content))
    const userImg =
      author.avatar && (await systemService.findAssetUrl(author.avatar))
    const articleImg = cover && (await systemService.findAssetUrl(cover))

    // add content to ipfs
    const html = this.ipfs.makeHTML({
      title,
      author: { userName: author.userName, displayName: author.displayName },
      summary,
      content,
      publishedAt: now
    })
    const dataHash = await this.ipfs.addHTML(html)

    // add meta data to ipfs
    let mediaObj: { [key: string]: any } = {
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
    const coverData = await this.ipfs.getDataAsFile(cover, '/')
    if (coverData && coverData.content) {
      const [{ hash }] = await this.ipfs.client.add(coverData.content, {
        pin: true
      })
      mediaObj.cover = { '/': hash }
    }

    // add upstream
    if (upstreamId) {
      const upstream = await this.dataloader.load(upstreamId)
      mediaObj.upstream = `ipfs://ipfs/${upstream.mediaHash}`
    }

    const cid = await this.ipfs.client.dag.put(_.pickBy(mediaObj, _.isObject), {
      format: 'dag-cbor',
      pin: true,
      hashAlg: 'sha2-256'
    })
    const mediaHash = cid.toBaseEncodedString()

    // edit db record
    const article = await this.create({
      authorId,
      upstreamId,
      title,
      slug: slugify(title),
      summary,
      content,
      dataHash,
      mediaHash,
      state: ARTICLE_STATE.active
    })

    return article
  }

  /**
   *  Find articles by a given author id (user).
   */
  findByAuthor = async (authorId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .orderBy('id', 'desc')

  /**
   * Find article by media hash
   */
  findByMediaHash = async (mediaHash: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ mediaHash })
      .first()

  /**
   * Find articles by upstream id (article).
   */
  findByUpstream = async (upstreamId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ upstreamId })

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .where({ authorId, state: ARTICLE_STATE.active })
      .count()
      .first()
    return parseInt(result.count, 10)
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

  search = async ({ key }: GQLSearchInput) => {
    const body = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 5,
        fields: ['title^10', 'content']
      })
      .size(100)
      .build()

    try {
      const { hits } = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })
      const ids = hits.hits.map(({ _id }) => _id)
      return this.baseFindByIds(ids)
    } catch (err) {
      logger.error(err)
      throw new ServerError('search failed')
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
      .select('view.*', 'setting.in_hottest')
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .orderByRaw('latest_activity DESC NULLS LAST')
      .where(where)
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
      .select('article.*', 'c.updated_at as chose_at')
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

    return await this.knex(table)
      .orderByRaw('topic_score DESC NULLS LAST')
      .where(where)
      .limit(limit)
      .offset(offset)
  }

  /**
   * Find One
   */
  findRecommendToday = async (articleId: string) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
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
    return parseInt(result.count, 10)
  }

  countRecommendIcymi = async (where: { [key: string]: any } = {}) => {
    const result = await this.knex('article')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .where(where)
      .count()
      .first()
    return parseInt(result.count, 10)
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
      .where(where)
      .count()
      .first()

    if (!oss) {
      qs = qs.andWhere(function() {
        this.where({ inHottest: true }).orWhereNull('in_hottest')
      })
    }
    const result = await qs
    return parseInt(result.count, 10)
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
    return parseInt(result.count, 10)
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
  totalAppreciation = async (articleId: string): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
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

  countAppreciators = async (articleId: string) => {
    const result = await this.knex('transaction')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .countDistinct('sender_id')
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async (referenceId: string): Promise<any[]> =>
    await this.knex('transaction')
      .select()
      .where({
        referenceId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })

  /**
   * Find an article's appreciators by a given article id.
   */
  findAppreciators = async ({
    id,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    id: string
    limit?: number
    offset?: number
  }) =>
    await this.knex('transaction')
      .distinct('sender_id')
      .select('sender_id')
      .where({
        referenceId: id,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .limit(limit)
      .offset(offset)

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
    return Math.max(ARTICLE_APPRECIATE_LIMIT - appreciations.length, 0)
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
    uuid,
    articleId,
    senderId,
    senderMAT,
    recipientId,
    amount
  }: {
    uuid: string
    articleId: string
    senderId: string
    senderMAT: number
    recipientId: string
    amount: number
  }): Promise<any> => {
    const result = await this.knex('transaction')
      .insert({
        uuid,
        senderId,
        recipientId,
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate,
        amount
      })
      .into('transaction')
      .returning('*')
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

    return limit ? await query.limit(limit) : await query
  }

  countSubscriptions = async (id: string) => {
    const result = await this.knex('action_article')
      .where({ targetId: id, action: USER_ACTION.subscribe })
      .countDistinct('user_id')
      .first()
    return parseInt(result.count, 10)
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
    await this.knex
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
    await this.baseCreate(
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
}

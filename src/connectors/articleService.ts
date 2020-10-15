import slugify from '@matters/slugify'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ALS_DEFAULT_VECTOR,
  APPRECIATION_PURPOSE,
  ARTICLE_APPRECIATE_LIMIT,
  ARTICLE_STATE,
  BATCH_SIZE,
  MATERIALIZED_VIEW,
  MINUTE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  USER_ACTION,
  VIEW,
} from 'common/enums'
import { isTest } from 'common/environment'
import { ArticleNotFoundError, ServerError } from 'common/errors'
import logger from 'common/logger'
import {
  countWords,
  makeSummary,
  outputCleanHTML,
  removeEmpty,
  stripHtml,
} from 'common/utils'
import { BaseService, gcp, ipfs, SystemService, UserService } from 'connectors'
import { GQLSearchInput, Item, ItemData } from 'definitions'

export class ArticleService extends BaseService {
  ipfs: typeof ipfs
  linkedDraftLoader: DataLoader<string, Item>

  constructor() {
    super('article')
    this.ipfs = ipfs

    this.dataloader = new DataLoader(async (ids: readonly string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      return result
    })

    this.uuidLoader = new DataLoader(async (uuids: readonly string[]) => {
      const result = await this.baseFindByUUIDs(uuids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      return result
    })

    this.linkedDraftLoader = new DataLoader(async (ids: readonly string[]) => {
      const items = await this.baseFindByIds(ids)

      if (items.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article')
      }

      const draftIds = items.map((item: any) => item.draftId)
      const result = await this.baseFindByIds(draftIds, 'draft')
      if (result.findIndex((item: any) => !item) >= 0) {
        throw new ArticleNotFoundError('Cannot find article linked draft')
      }
      return result
    })
  }

  /**
   * Publish an article to IPFS
   */
  publish = async ({
    id,
    authorId,
    title,
    cover,
    summary: draftSummary,
    content,
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
      publishedAt: now,
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
        description: author.description,
      },
      dateCreated: now.toISOString(),
      description: summary,
      image: articleImg,
    }

    // add cover to ipfs
    // TODO: check data type for cover
    if (articleImg) {
      const coverData = await this.ipfs.getDataAsFile(articleImg, '/')
      if (coverData && coverData.content) {
        const [{ hash }] = await this.ipfs.client.add(coverData.content, {
          pin: true,
        })
        mediaObj.cover = { '/': hash }
      }
    }

    const mediaObjectCleaned = removeEmpty(mediaObj)

    const cid = await this.ipfs.client.dag.put(mediaObjectCleaned, {
      format: 'dag-cbor',
      pin: true,
      hashAlg: 'sha2-256',
    })
    const mediaHash = cid.toBaseEncodedString()

    // craete article
    const article = await this.baseCreate({
      uuid: v4(),
      authorId,
      title,
      slug: slugify(title),
      wordCount: countWords(content),
      summary,
      content,
      cover,
      dataHash,
      mediaHash,
      state: ARTICLE_STATE.active,
      draftId: id,
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
        id,
        body: {
          doc: { state: ARTICLE_STATE.archived },
        },
      })
    } catch (e) {
      logger.error(e)
    }

    return this.baseUpdate(id, {
      state: ARTICLE_STATE.archived,
      sticky: false,
      updatedAt: new Date(),
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
        { column: 'id', order: 'desc' },
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
    this.knex.select().from(this.table).where({ mediaHash }).first()

  /**
   * Find article by title
   */
  findByTitle = async ({
    title,
    oss = false,
    filter,
  }: {
    title: string
    oss?: boolean
    filter?: Record<string, any>
  }) => {
    const query = this.knex.select().from(this.table).where({ title })

    if (!oss) {
      query.andWhere({ state: ARTICLE_STATE.active })
    }

    if (filter && Object.keys(filter).length > 0) {
      query.andWhere(filter)
    }

    return query.orderBy('id', 'desc')
  }

  /**
   * Find article by draft id
   */
  findByDraftId = async (draftId: string) =>
    this.knex.select().from(this.table).where({ draftId }).first()

  /**
   * Find article by which set as sticky.
   */
  findBySticky = async (authorId: string, sticky: boolean) =>
    this.knex.select('id').from(this.table).where({ authorId, sticky: true })

  /**
   * Find articles by which commented by author.
   */
  findByCommentedAuthor = async (authorId: string) =>
    this.knex
      .select('article.*')
      .max('comment.id', { as: '_comment_id_' })
      .from('comment')
      .innerJoin(this.table, 'comment.article_id', 'article.id')
      .where({ 'comment.author_id': authorId })
      .groupBy('article.id')
      .orderBy('_comment_id_', 'desc')

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: string, activeOnly: boolean = true) => {
    let qs = this.knex(this.table).where({ authorId }).count().first()

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
  ) => {
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

  /**
   * Count articles by given ids and author.
   *
   */
  countByIdsAndAuthor = async ({
    authorId,
    ids,
  }: {
    authorId: string
    ids: string[]
  }) => {
    const result = await this.knex(this.table)
      .whereIn('id', ids)
      .andWhere({ authorId })
      .count()
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
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
    const articles = await this.knex(this.table)
      .innerJoin('user', `${this.table}.author_id`, 'user.id')
      .select(
        `${this.table}.id as id`,
        'title',
        'content',
        'author_id as authorId',
        'user.user_name as userName',
        'user.display_name as displayName'
      )

    return this.es.indexManyItems({
      index: this.table,
      items: articles.map(
        (article: { content: string; title: string; id: string }) => ({
          ...article,
          content: stripHtml(article.content),
          factor: ALS_DEFAULT_VECTOR.factor,
          embedding_vector: ALS_DEFAULT_VECTOR.embedding,
        })
      ),
    })
  }

  addToSearch = async ({
    id,
    title,
    content,
    authorId,
    userName,
    displayName,
    tags,
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
          state: ARTICLE_STATE.active,
          authorId,
          userName,
          displayName,
          tags,
          factor: ALS_DEFAULT_VECTOR.factor,
          embedding_vector: ALS_DEFAULT_VECTOR.embedding,
        },
      ],
    })
    return result
  }

  searchByMediaHash = async ({
    key,
    oss = false,
    filter,
  }: {
    key: string
    oss?: boolean
    filter?: Record<string, any>
  }) => {
    const query = this.knex.select().from(this.table).where({ mediaHash: key })

    if (!oss) {
      query.andWhere({ state: ARTICLE_STATE.active })
    }

    if (filter && Object.keys(filter).length > 0) {
      query.andWhere(filter)
    }

    const rows = await query
    if (rows.length > 0) {
      return {
        nodes: rows,
        totalCount: rows.length,
      }
    } else {
      throw new ServerError('article search by media hash failed')
    }
  }

  search = async ({
    key,
    first = 20,
    offset,
    oss = false,
    filter,
  }: GQLSearchInput & {
    author?: string
    offset: number
    oss?: boolean
    filter?: Record<string, any>
  }) => {
    const searchBody = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 'AUTO',
        fields: [
          'displayName^15',
          'title^10',
          'title.synonyms^5',
          'content^2',
          'content.synonyms',
        ],
        type: 'most_fields',
      })
      .from(offset)
      .size(first)

    // only return active if not in oss
    if (!oss) {
      searchBody.filter('term', { state: ARTICLE_STATE.active })
    }

    // add filter
    if (filter && Object.keys(filter).length > 0) {
      searchBody.filter('term', filter)
    }

    try {
      // check if media hash in search key
      const re = /^([0-9a-zA-Z]{49,59})$/gi
      const match = re.exec(key)
      if (match) {
        return this.searchByMediaHash({ key: match[1], oss, filter })
      }

      // take the condition that searching for exact article title into consideration
      const idsByTitle = []
      if (key.length >= 5 && offset === 0) {
        const articles = await this.findByTitle({ title: key, oss, filter })
        for (const article of articles) {
          idsByTitle.push(article.id)
        }
      }
      searchBody.notFilter('ids', { values: idsByTitle })

      const { body } = await this.es.client.search({
        index: this.table,
        body: searchBody.build(),
      })
      const { hits } = body
      const ids = idsByTitle.concat(
        hits.hits.map(({ _id }: { _id: any }) => _id)
      )
      const nodes = await this.baseFindByIds(ids, this.table)

      return {
        nodes,
        totalCount: idsByTitle.length + hits.total.value,
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
  recommendByScore = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false,
    score = 'activity',
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
    score?: 'activity' | 'value'
  }) => {
    // use view when oss for real time update
    // use materialized in other cases
    let table
    if (score === 'activity') {
      table = oss
        ? VIEW.articleHottestA
        : MATERIALIZED_VIEW.articleHottestAMaterialized
    } else {
      table = oss
        ? VIEW.articleValue
        : MATERIALIZED_VIEW.articleValueMaterialized
    }

    let qs = this.knex(`${table} as view`)
      .select('view.id', 'setting.in_hottest', 'article.*')
      .rightJoin('article', 'view.id', 'article.id')
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .orderByRaw('score desc nulls last')
      .orderBy([{ column: 'view.id', order: 'desc' }])
      .where({ 'article.state': ARTICLE_STATE.active, ...where })
      .limit(limit)
      .offset(offset)

    if (!oss) {
      qs = qs.andWhere(function () {
        this.where({ inHottest: true }).orWhereNull('in_hottest')
      })
    }

    const result = await qs
    return result
  }

  /**
   * TODO: temporary for A/B testing of hottest
   */
  recommendByScoreB = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false,
    score = 'activity',
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
    score?: 'activity' | 'value'
  }) => {
    // use view when oss for real time update
    // use materialized in other cases
    let table
    if (score === 'activity') {
      table = oss
        ? VIEW.articleHottestB
        : MATERIALIZED_VIEW.articleHottestBMaterialized
    } else {
      table = oss
        ? VIEW.articleValue
        : MATERIALIZED_VIEW.articleValueMaterialized
    }

    let qs = this.knex(`${table} as view`)
      .select('view.id', 'setting.in_hottest', 'article.*')
      .rightJoin('article', 'view.id', 'article.id')
      .leftJoin(
        'article_recommend_setting as setting',
        'view.id',
        'setting.article_id'
      )
      .orderByRaw('score desc nulls last')
      .orderBy([{ column: 'view.id', order: 'desc' }])
      .where({ 'article.state': ARTICLE_STATE.active, ...where })
      .limit(limit)
      .offset(offset)

    if (!oss) {
      qs = qs.andWhere(function () {
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
    oss = false,
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
      qs = qs.andWhere(function () {
        this.where({ inNewest: true }).orWhereNull('in_newest')
      })
    }

    const result = await qs
    return result
  }

  recommendIcymi = async ({
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    limit?: number
    offset?: number
  }) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where({ state: ARTICLE_STATE.active })
      .offset(offset)
      .limit(limit)

  recommendTopics = async ({
    limit = BATCH_SIZE,
    offset = 0,
    where = {},
    oss = false,
  }: {
    limit?: number
    offset?: number
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    const table = oss
      ? 'article_count_view'
      : MATERIALIZED_VIEW.articleCountMaterialized

    return this.knex(`${table} as view`)
      .select('view.score', 'article.*')
      .join('article', 'view.id', 'article.id')
      .orderByRaw('score DESC NULLS LAST')
      .orderBy('view.id', 'desc')
      .where({ 'article.state': ARTICLE_STATE.active, ...where })
      .limit(limit)
      .offset(offset)
  }

  recommendByInterest = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    userId: string
    limit?: number
    offset?: number
  }) =>
    this.knex(`article_interest_materialized as interests`)
      .select('*')
      .join('article', 'interests.id', 'article.id')
      .orderBy('score', 'desc')
      .where({ 'article.state': ARTICLE_STATE.active, userId })
      .limit(limit)
      .offset(offset)

  related = async ({
    id,
    size,
    notIn = [],
  }: {
    id: string
    size: number
    notIn?: string[]
  }) => {
    // skip if in test
    if (isTest) {
      return []
    }

    // get vector score
    const scoreResult = await this.es.client.get({
      index: this.table,
      id,
    })

    const factorString = _.get(scoreResult.body, '_source.embedding_vector')

    // return empty list if we don't have any score
    if (!factorString || factorString === ALS_DEFAULT_VECTOR.embedding) {
      return []
    }

    const searchBody = bodybuilder()
      .query('function_score', {
        boost_mode: 'replace',
        script_score: {
          script: {
            source: 'binary_vector_score',
            lang: 'knn',
            params: {
              cosine: true,
              field: 'embedding_vector',
              encoded_vector: factorString,
            },
          },
        },
      })
      .filter('term', { state: ARTICLE_STATE.active })
      .notFilter('term', { factor: ALS_DEFAULT_VECTOR.factor })
      .notFilter('ids', { values: notIn.concat([id]) })
      .size(size)
      .build()

    const { body } = await this.es.client.search({
      index: this.table,
      body: searchBody,
    })
    // add recommendation
    return body.hits.hits.map((hit: any) => ({ ...hit, id: hit._id }))
  }

  /*********************************
   *                               *
   *           Translate           *
   *                               *
   *********************************/

  translate = ({ content, target }: { content: string; target: string }) =>
    gcp.translate({ content, target })

  detectLanguage = (content: string) => gcp.detectLanguage(content)

  /**
   * Find One
   */

  findRecommendIcymi = async (articleId: string) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .where({ articleId })
      .first()

  /**
   * Count
   */
  countRecommendIcymi = async () => {
    const result = await this.knex('article')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .where({ state: ARTICLE_STATE.active })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendInterest = async ({ userId }: { userId: string }) => {
    const result = await this.knex('article_interest_materialized')
      .where({ userId })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendHottest = async ({
    where = {},
    oss = false,
  }: {
    where?: { [key: string]: any }
    oss?: boolean
  }) => {
    // use view when oss for real time update
    // use materialized in other cases
    const table = oss
      ? 'article_activity_view'
      : MATERIALIZED_VIEW.articleActivityMaterialized

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
      qs = qs.andWhere(function () {
        this.where({ inHottest: true }).orWhereNull('in_hottest')
      })
    }
    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countRecommendNewest = async ({
    where = {},
    oss = false,
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
      qs = qs.andWhere(function () {
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
      table: 'article_boost',
    })

  findScore = async (articleId: string) => {
    const article = await this.knex('article_count_view')
      .select()
      .where({ id: articleId })
      .first()
    return article?.score || 0
  }

  /**
   * Find or Update recommendation
   */

  addRecommendIcymi = async (articleId: string) =>
    this.baseFindOrCreate({
      where: { articleId },
      data: { articleId },
      table: 'matters_choice',
    })

  removeRecommendIcymi = async (articleId: string) =>
    this.knex('matters_choice').where({ articleId }).del()

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
    data,
  }: {
    articleId: string
    data: { [key in 'inHottest' | 'inNewest']?: boolean }
  }) =>
    this.baseUpdateOrCreate({
      where: { articleId },
      data: { ...data, articleId },
      table: 'article_recommend_setting',
    })

  /*********************************
   *                               *
   *          Appreciaton          *
   *                               *
   *********************************/
  /**
   * Sum total appreciaton by a given article id.
   */
  sumAppreciation = async (articleId: string) => {
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
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  /**
   * Count an article's appreciations by a given articleId.
   */
  countAppreciations = async (referenceId: string) => {
    const result = await this.knex
      .select()
      .from((knex: any) => {
        const source = knex
          .select('reference_id', 'sender_id')
          .from('appreciation')
          .where({
            referenceId,
            purpose: APPRECIATION_PURPOSE.appreciate,
          })
          .groupBy('sender_id', 'reference_id')
        source.as('source')
      })
      .count()
      .first()

    return parseInt(result.count || '0', 10)
  }

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async ({
    referenceId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    referenceId: string
    limit?: number
    offset?: number
  }) => {
    const result = await this.knex('appreciation')
      .select('reference_id', 'sender_id')
      .where({
        referenceId,
        purpose: APPRECIATION_PURPOSE.appreciate,
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
    const total = _.get(appreciations, '0.total', 0)

    return Math.max(ARTICLE_APPRECIATE_LIMIT - total, 0)
  }

  hasAppreciate = async ({
    userId: senderId,
    articleId,
  }: {
    userId: string
    articleId: string
  }) => {
    const result = await this.knex('appreciation').select().where({
      senderId,
      referenceId: articleId,
      purpose: APPRECIATION_PURPOSE.appreciate,
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
        .update({
          amount: Math.min(bundle.amount + amount, ARTICLE_APPRECIATE_LIMIT),
          createdAt: this.knex.fn.now(),
        })
    } else {
      const uuid = v4()
      result = await this.knex('appreciation')
        .insert({
          ...appreciation,
          uuid,
          amount,
        })
        .into('appreciation')
        .returning('*')
    }

    return result
  }

  /**
   * Super Like
   */
  superlike = async ({
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
      purpose: APPRECIATION_PURPOSE.superlike,
      type,
    }

    const uuid = v4()
    const result = await this.knex('appreciation')
      .insert({
        ...appreciation,
        uuid,
        amount,
      })
      .into('appreciation')
      .returning('*')

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
  findTagIds = async ({
    id: articleId,
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
    offset = 0,
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
    targetId,
  }: {
    userId: string
    targetId: string
  }) => {
    const result = await this.knex
      .select()
      .from('action_article')
      .where({ userId, targetId, action: USER_ACTION.subscribe })
    return result.length > 0
  }

  /**
   * User subscribe an article
   */
  subscribe = async (targetId: string, userId: string) => {
    const data = {
      targetId,
      userId,
      action: USER_ACTION.subscribe,
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_article',
    })
  }

  /**
   * User unsubscribe an article
   */
  unsubscribe = async (targetId: string, userId: string) =>
    this.knex
      .from('action_article')
      .where({
        targetId,
        userId,
        action: USER_ACTION.subscribe,
      })
      .del()

  findUserSubscribe = async (targetId: string, userId: string) =>
    this.knex
      .from('action_article')
      .where({
        targetId,
        userId,
        action: USER_ACTION.subscribe,
      })
      .first()

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  /**
   * User read an article
   */
  read = async ({
    userId,
    articleId,
    ip,
  }: {
    articleId: string
    userId?: string | null
    ip?: string
  }) => {
    const table = 'article_read_count'

    // current read data
    const newData = {
      articleId,
      userId,
      updatedAt: new Date(),
      archived: false,
      ip,
    }

    // past record
    const record = await this.baseFind({ where: { articleId, userId }, table })

    // create create new record if none exists
    if (!record || record.length === 0) {
      await this.baseCreate(
        {
          ...newData,
          count: 1,
          timedCount: 1,
          readTime: 0,
          lastRead: new Date(),
        },
        table
      )
      return { newRead: true }
    }

    // get old data
    const oldData = record[0]

    // calculate heart beat lapsed time in secondes
    const lapse = Date.now() - new Date(oldData.updatedAt).getTime()

    // calculate last read total time
    const readLength = Date.now() - new Date(oldData.lastRead).getTime()

    // if original read longer than 30 minutes
    // skip
    if (readLength > MINUTE * 30) {
      return { newRead: false }
    }

    // if lapse is longer than 5 minutes
    // add a new count and update last read timestamp
    if (lapse > MINUTE * 5 || readLength > MINUTE * 30) {
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
      return { newRead: true }
    }

    // other wise accumulate time
    await this.baseUpdate(
      oldData.id,
      {
        ...oldData,
        ...newData,
        readTime: Math.round(parseInt(oldData.readTime, 10) + lapse / 1000),
      },
      table
    )
    return { newRead: false }
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
    articleIds,
  }: {
    articleIds: string[]
    entranceId: string
  }) => {
    const items = articleIds.map((articleId, index) => ({
      entranceId,
      articleId,
      order: index,
      createdAt: new Date(),
      updatedAt: new Date(),
    }))
    return this.baseBatchCreate(items, 'collection')
  }

  /**
   * Insert a single record to collection for article
   */
  insertCollection = async ({
    entranceId,
    articleId,
    order,
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
        updatedAt: new Date(),
      },
      'collection'
    )

  /**
   * Update a collection order by given entrance id and article id.
   */
  updateCollectionOrder = async ({
    entranceId,
    articleId,
    order,
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
    articleIds,
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
    articleId,
  }: {
    entranceId: string | number
    articleId: string
  }) =>
    this.knex('collection').select().where({ entranceId, articleId }).first()

  /**
   * Find an article's collections by a given article id.
   */
  findCollections = async ({
    entranceId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    entranceId: string
    limit?: number | null
    offset?: number
  }) => {
    const query = this.knex('collection')
      .select('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId, state: ARTICLE_STATE.active })
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
    offset = 0,
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
      .countDistinct('article_id', 'state')
      .innerJoin('article', 'article.id', 'article_id')
      .where({ entranceId: id, state: ARTICLE_STATE.active })
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

  makeResponseQuery = ({
    id,
    order,
    state,
    fields = '*',
    articleOnly = false,
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
    articleOnly,
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
      articleOnly,
    })
    return query.where({ entityId }).first()
  }

  findResponses = ({
    id,
    order = 'desc',
    state = ARTICLE_STATE.active,
    after,
    before,
    first,
    includeAfter = false,
    includeBefore = false,
    articleOnly = false,
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
        articleOnly,
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
        entityId: before,
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
    state,
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
      min: parseInt(min, 10),
    }
  }

  countByResponses = async ({
    id,
    order = 'desc',
    state = ARTICLE_STATE.active,
  }: {
    id: string
    order?: string
    state?: string
  }) => {
    const query = this.makeResponseQuery({ id, order, state, fields: '' })
    const { count } = await query.count().first()
    return parseInt(count, 10)
  }

  /*********************************
   *                               *
   *             Churn             *
   *                               *
   *********************************/
  /**
   * Find top appreciations articles in a range of time
   */
  findTopAppreciations = async ({
    limit = BATCH_SIZE,
    offset = 0,
    since,
  }: {
    limit?: number
    offset?: number
    since?: Date | string
  }) => {
    let qs = this.knex
      .select('article.*')
      .from('article')
      .rightJoin(
        this.knex
          .select('referenceId')
          .sum('amount', { as: 'total' })
          .from('appreciation')
          .whereIn('purpose', [
            APPRECIATION_PURPOSE.appreciate,
            APPRECIATION_PURPOSE.appreciateSubsidy,
          ])
          .groupBy('referenceId')
          .orderBy('total', 'desc')
          .as('tx'),
        'tx.referenceId',
        'article.id'
      )
      .where('state', ARTICLE_STATE.active)
      .offset(offset)
      .limit(limit)

    if (since) {
      qs = qs.where('createdAt', '>=', since)
    }
    return qs
  }

  /*********************************
   *                               *
   *          Transaction          *
   *                               *
   *********************************/
  /**
   * Count an article's transactions by a given articleId.
   */
  countTransactions = async ({
    purpose = TRANSACTION_PURPOSE.donation,
    state = TRANSACTION_STATE.succeeded,
    targetId,
    targetType = TRANSACTION_TARGET_TYPE.article,
  }: {
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
    const result = await this.knex
      .select()
      .from((knex: any) => {
        const source = knex
          .select('sender_id', 'target_id')
          .from('transaction')
          .where({
            purpose,
            state,
            targetId,
            targetType: entityTypeId,
          })
          .groupBy('sender_id', 'target_id')
        source.as('source')
      })
      .count()
      .first()

    return parseInt(result.count || '0', 10)
  }

  /**
   * Find an article's transactions by a given articleId.
   */
  findTransactions = async ({
    limit = BATCH_SIZE,
    offset = 0,
    purpose = TRANSACTION_PURPOSE.donation,
    state = TRANSACTION_STATE.succeeded,
    targetId,
    targetType = TRANSACTION_TARGET_TYPE.article,
  }: {
    limit?: number
    offset?: number
    purpose?: TRANSACTION_PURPOSE
    state?: TRANSACTION_STATE
    targetId: string
    targetType?: TRANSACTION_TARGET_TYPE
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(targetType)
    const result = await this.knex('transaction')
      .select('sender_id', 'target_id')
      .where({
        purpose,
        state,
        targetId,
        targetType: entityTypeId,
      })
      .groupBy('sender_id', 'target_id')
      .sum('amount as amount')
      .max('created_at as created_at')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    return result
  }

  /**
   * Count articles which also donated by the donator of a given article
   */
  makeRelatedDonationsQuery = ({
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

  countRelatedDonations = async ({
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

    const result = await this.knex.count('target_id').from(query).first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find articles which also donated by the donator of a given article
   */
  findRelatedDonations = async ({
    articleId,
    notIn,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    articleId: string
    notIn: string[]
    limit?: number
    offset?: number
  }) => {
    const { id: entityTypeId } = await this.baseFindEntityTypeId(
      TRANSACTION_TARGET_TYPE.article
    )

    const query = this.makeRelatedDonationsQuery({
      articleId,
      targetTypeId: entityTypeId,
      notIn,
    })

    return query.orderBy('score').limit(limit).offset(offset)
  }
}

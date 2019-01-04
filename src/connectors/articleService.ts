import * as cheerio from 'cheerio'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import { ItemData, GQLSearchInput } from 'definitions'
import { v4 } from 'uuid'

import {
  BATCH_SIZE,
  USER_ACTION,
  PUBLISH_STATE,
  TRANSACTION_PURPOSE
} from 'common/enums'
import { BaseService } from './baseService'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  // dump all data to es. Currently only used in test.
  initSearch = async () => {
    const articles = await this.knex(this.table).select(
      'content',
      'title',
      'id'
    )

    return this.es.indexItems({
      index: this.table,
      items: articles
    })
  }

  /**
   * Create a new article item.
   */
  create = async ({
    authorId,
    upstreamId,
    title,
    cover,
    summary,
    content,
    draftId,
    publishState = PUBLISH_STATE.pending
  }: ItemData) => {
    // craete article
    const article = await this.baseCreate({
      uuid: v4(),
      authorId,
      upstreamId,
      title,
      cover,
      summary,
      draftId,
      content,
      publishState,
      wordCount: this.countWords(content)
    })
    // TODO: create tags
    return article
  }

  // publish an article to IPFS, add to search, and mark draft as read
  publish = async (id: string) => {
    // TODO: publish to IPFS and get hashes
    const dataHash = 'some-test-hash'
    const mediaHash = 'some-test-hash'

    // edit db record
    const [article] = await this.knex(this.table)
      .returning('*')
      .where({ id })
      .update({
        dataHash,
        mediaHash,
        publishState: PUBLISH_STATE.published,
        updatedAt: this.knex.fn.now()
      })

    return article
  }

  addToSearch = async ({
    id,
    title,
    content,
    tags
  }: {
    [key: string]: string
  }) =>
    this.es.indexItems({
      index: this.table,
      items: [
        {
          id,
          title,
          content,
          tags
        }
      ]
    })

  search = async ({ key, limit = 10, offset = 0 }: GQLSearchInput) => {
    const body = bodybuilder()
      .query('multi_match', {
        query: key,
        fuzziness: 5,
        fields: ['title^10', 'content']
      })
      .size(limit)
      .from(offset)
      .build()

    try {
      const { hits } = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })
      const ids = hits.hits.map(({ _id }) => _id)
      // TODO: determine if id exsists and use dataloader
      const articles = await this.baseFindByIds(ids)
      return articles.map((article: { [key: string]: string }) => ({
        node: { ...article, __type: 'Article' },
        match: key
      }))
    } catch (err) {
      throw err
    }
  }

  recommendHottest = ({ offset = 0, limit = 5 }) =>
    this.knex('article_activity_view')
      .orderBy('latest_activity', 'desc null last')
      .limit(limit)
      .offset(offset)

  recommendIcymi = ({ offset = 0, limit = 5 }) =>
    this.knex('article')
      .select('article.*', 'c.updated_at as chose_at')
      .join('matters_choice as c', 'c.article_id', 'article.id')
      .orderBy('chose_at', 'desc')
      .offset(offset)
      .limit(limit)

  recommendTopics = ({ offset = 0, limit = 5 }) =>
    this.knex('article_count_view')
      .orderBy('topic_score', 'desc')
      .limit(limit)
      .offset(offset)

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId, publishState: PUBLISH_STATE.published })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count total appreciaton by a given article id.
   */
  countAppreciation = async (articleId: string): Promise<number> => {
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
    articleId: referenceId,
    userIds
  }: {
    articleId: string
    userIds: string[]
  }): Promise<number> => {
    const result = await this.knex
      .select()
      .from('transaction')
      .where({ referenceId })
      .whereIn('sender_Id', userIds)
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  /**
   * Counts words witin in html content.
   */
  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  /**
   *  Find articles by a given author id (user) in batches.
   */
  findByAuthor = async ({
    id: authorId,
    publishState,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    id: string
    publishState?: string
    offset?: number
    limit?: number
  }) => {
    let where: { [key: string]: string } = { authorId }
    if (publishState) {
      where.publishState = publishState
    }
    return await this.knex
      .select()
      .from(this.table)
      .where(where)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)
  }

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
  findByUpstream = async (
    upstreamId: string,
    offset: number,
    limit = BATCH_SIZE
  ) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ upstreamId })
      .offset(offset)
      .limit(limit)

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async (referenceId: string): Promise<any[]> =>
    await this.knex('transaction')
      .select()
      .where({ referenceId })

  /**
   * Find an article's appreciators by a given article id.
   */
  findAppreciators = async ({
    articleId,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    articleId: string
    offset?: number
    limit?: number
  }): Promise<any[]> =>
    await this.knex('transaction')
      .distinct('sender_id')
      .select('sender_id')
      .where({
        referenceId: articleId,
        purpose: TRANSACTION_PURPOSE.appreciate
      })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

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

  /**
   * Find an article's subscribers by a given targetId (article).
   */
  findSubscriptions = async (targetId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({ targetId, action: USER_ACTION.subscribe })

  /**
   * Find an article's subscribers by a given targetId (article) in batches.
   */
  findSubscriptionsInBatch = async (
    targetId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({ targetId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find an article's subscriber by a given targetId (article) and user id.
   */
  findSubscriptionByUserId = async (
    targetId: string,
    userId: string
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({
        targetId,
        userId,
        action: USER_ACTION.subscribe
      })

  /**
   * Find an article's rates by a given targetId (article).
   */
  findRateByTargetId = async (targetId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({
        targetId,
        action: USER_ACTION.rate
      })

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
   * User subscribe an article
   */
  subscribe = async (targetId: string, userId: string): Promise<any[]> =>
    await this.baseCreate(
      {
        targetId,
        userId,
        action: USER_ACTION.subscribe
      },
      'action_article'
    )

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

  /**
   * User appreciate an article
   */
  appreciate = async ({
    articleId,
    senderId,
    senderMAT,
    recipientId,
    amount
  }: {
    articleId: string
    senderId: string
    senderMAT: number
    recipientId: string
    amount: number
  }): Promise<any> =>
    // TODO: remove mat from user and retrive from transaction table when needed
    this.knex.transaction(async trx => {
      await trx
        .where('id', senderId)
        .update('mat', senderMAT - amount)
        .into('user')
      await trx
        .insert({
          senderId,
          recipientId,
          referenceId: articleId,
          purpose: TRANSACTION_PURPOSE.appreciate,
          amount
        })
        .into('transaction')
        .returning('*')
    })

  /**
   * User read an article
   */
  read = async (articleId: string, userId: string): Promise<any[]> => {
    const readHistory = await this.knex
      .select()
      .from('article_read')
      .where({ articleId, userId, archived: false })
      .first()

    if (readHistory) {
      return readHistory
    }

    return await this.baseCreate(
      {
        uuid: v4(),
        articleId,
        userId
      },
      'article_read'
    )
  }

  /**
   * User report an article
   */
  report = async (
    articleId: string,
    userId: string,
    category: string,
    description: string,
    assetIds: string[] | undefined
  ): Promise<void> => {
    // create report
    const { id: reportId } = await this.baseCreate(
      {
        userId,
        articleId,
        category,
        description
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

  // TODO
  getContentFromHash = (hash: string) => `
    <html>
      <head>
        <title></title>
      </head>
      <body>
        <p></p>
      </body>
    </html>`
}

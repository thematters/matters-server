import * as cheerio from 'cheerio'
import DataLoader from 'dataloader'
import { ItemData } from 'definitions'
import { v4 } from 'uuid'

import { BATCH_SIZE, USER_ACTION, PUBLISH_STATE } from 'common/enums'
import { BaseService } from './baseService'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
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

  addToSearch = ({
    id,
    title,
    summary,
    content,
    tags
  }: {
    [key: string]: string
  }) =>
    this.es.index({
      index: 'article',
      id,
      type: 'article',
      body: {
        title,
        summary,
        content,
        tags
      }
    })

  // TODO: rank hottest
  recommendHottest = ({ offset = 0, limit = 5 }) =>
    this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  // TODO: get articles from hottest
  followeeArticles = ({ offset = 0, limit = 5 }) =>
    this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  // TODO: rank icymi
  recommendIcymi = ({ offset = 0, limit = 5 }) =>
    this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  // TODO: rank topics
  recommendTopics = ({ offset = 0, limit = 5 }) =>
    this.knex
      .select()
      .from(this.table)
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

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
      .from('appreciate')
      .where({ articleId })
      .sum('amount')
      .first()
    return parseInt(result.sum || '0', 10)
  }

  /**
   * Count total appreciaton by a given article id and user ids.
   */
  countAppreciationByUserIds = async (
    articleId: string,
    userIds: string[]
  ): Promise<number> => {
    const result = await this.knex
      .select()
      .from('appreciate')
      .where({ articleId })
      .whereIn('userId', userIds)
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
  findAppreciations = async (articleId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('appreciate')
      .where({ articleId })

  /**
   * Find an article's appreciations by a given article id in batches.
   */
  findAppreciationsInBatch = async (
    articleId: string,
    offset = 0,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('appreciate')
      .where({ articleId })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find an article's appreciators by a given article id in batches.
   */
  findAppreciatorsInBatch = async (
    articleId: string,
    offset = 0,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex('appreciate')
      .distinct('user_id')
      .select('id')
      .where({ articleId })
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
    userId,
    articleId
  }: {
    userId: string
    articleId: string
  }): Promise<boolean> => {
    const result = await this.knex
      .select()
      .from('appreciate')
      .where({ userId, articleId })
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
  appreciate = async (
    articleId: string,
    userId: string,
    amount: number,
    userMAT: number
  ): Promise<any> =>
    this.knex.transaction(async trx => {
      await trx
        .where('id', userId)
        .update('mat', userMAT - amount)
        .into('user')
      await trx
        .insert({
          userId,
          articleId,
          amount
        })
        .into('appreciate')
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
    description: string
  ): Promise<any[]> =>
    await this.baseCreate(
      {
        userId,
        articleId,
        category,
        description
      },
      'report_article'
    )

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

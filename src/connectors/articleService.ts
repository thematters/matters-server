import * as cheerio from 'cheerio'
import { BaseService } from './baseService'
import { BATCH_SIZE, USER_ACTION } from 'common/enums'
import DataLoader from 'dataloader'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId })
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

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  /**
   * Find articles by a given author id (user).
   */
  findByAuthor = async (authorId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })

  /**
   *  Find articles by a given author id (user) in batches.
   */
  findByAuthorInBatch = async (
    authorId: string,
    offset: number,
    limit = BATCH_SIZE
  ) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  findByUpstream = async (upstreamId: string) =>
    await this.knex
      .select()
      .from(this.table)
      .where({ upstreamId })

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
    offset: number,
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
    offset: number,
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
  findSubscriptionByTargetIdAndUserId = async (
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

  /**
   * Find article read records by articleId and user id
   */
  findReadByArticleIdAndUserId = async (
    articleId: string,
    userId: string
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('article_read')
      .where({
        articleId,
        userId
      })

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

  // findRateByTargetId = async (targetId: string): Promise<any[]> => {
  //   return await this.knex
  //     .select()
  //     .from('action_user')
  //     .where({
  //       target_id: targetId,
  //       action: USER_ACTION.rate
  //     })
  // }

  // update an object with id and kv pairs object
  update = async (id: string, kv: { [k: string]: any }) => {
    const qs = await this.knex(this.table)
      .where({
        id
      })
      .update(kv)
      .returning('*')

    return qs[0]
  }

  /**
   * User read an article
   */
  read = async (articleId: string, userId: string): Promise<any[]> =>
    await this.baseCreate(
      {
        userId,
        articleId
      },
      'article_read'
    )

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

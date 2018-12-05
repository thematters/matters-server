import * as cheerio from 'cheerio'
import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'
import { USER_ACTION } from 'src/common/enums'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count articles by a given authorId (user).
   */
  countByAuthor = async (authorId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('author_id', authorId)
    return parseInt(result[0].count || '0')
  }

  /**
   * Count total appreciaton by a given article id.
   */
  countAppreciation = async (id: number): Promise<number> => {
    const result = await this.knex
      .select()
      .from('appreciate')
      .where('article_id', id)
      .sum('amount')
    return parseInt(result[0].sum || '0')
  }

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  findByAuthor = async (id: number) =>
    await this.knex
      .select()
      .from(this.table)
      .where('author_id', id)

  findByUpstream = async (upstreamId: number) =>
    await this.knex
      .select()
      .from(this.table)
      .where('upstream_id', upstreamId)

  /**
   * Find an article's appreciations by a given articleId.
   */
  findAppreciations = async (articleId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('appreciate')
      .where('article_id', articleId)
  }

  countByTag = async (tag: string): Promise<number> => {
    const qs = await this.knex('article_tag')
      .countDistinct('article_id')
      .where('tag', tag)
      .first()
    return parseInt(qs.count, 10)
  }

  findByTag = async (tag: string) => {
    const qs = await this.knex
      .select()
      .from('article_tag')
      .where('tag', tag)
    return this.baseFindByIds(
      qs.map(({ articleId }: { articleId: number }) => articleId)
    )
  }

  findTagsById = async (id: number): Promise<any | null> => {
    const qs = await this.knex
      .select()
      .from('article_tag')
      .where('article_id', id)
    return qs.map(({ tag }: { tag: string }) => tag)
  }

  /**
   * Find an article's subscribers by a given targetId (article).
   */
  findSubscriptionByTargetId = async (targetId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({
        targetId,
        action: USER_ACTION.subscribe
      })

  /**
   * Find an article's subscriber by a given targetId (article) and user id.
   */
  findSubscriptionByTargetIdAndUserId = async (
    targetId: number,
    userId: number
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
  findRateByTargetId = async (targetId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({
        targetId,
        action: USER_ACTION.rate
      })

  /**
   * Find article read records by articleId and userId
   */
  findReadByArticleIdAndUserId = async (
    articleId: number,
    userId: number
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
  subscribe = async (targetId: number, userId: number): Promise<any[]> =>
    (await this.knex
      .insert({
        targetId,
        userId,
        action: USER_ACTION.subscribe
      })
      .into('action_article')
      .returning('*'))[0]

  /**
   * User unsubscribe an article
   */
  unsubscribe = async (targetId: number, userId: number): Promise<any[]> =>
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
    articleId: number,
    userId: number,
    amount: number,
    userMAT: number
  ): Promise<any> =>
    this.knex.transaction(async function(trx) {
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
  // findRateByTargetId = async (targetId: number): Promise<any[]> => {
  //   return await this.knex
  //     .select()
  //     .from('action_user')
  //     .where({
  //       target_id: targetId,
  //       action: USER_ACTION.rate
  //     })
  // }

  // update an object with id and kv pairs object
  update = async (id: number, kv: { [k: string]: any }) => {
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
  read = async (articleId: number, userId: number): Promise<any[]> =>
    (await this.knex
      .insert({
        userId,
        articleId
      })
      .into('article_read')
      .returning('*'))[0]

  /**
   * User report an article
   */
  report = async (
    articleId: number,
    userId: number,
    category: string,
    description: string
  ): Promise<any[]> =>
    (await this.knex
      .insert({
        userId,
        articleId,
        category,
        description
      })
      .into('report_article')
      .returning('*'))[0]

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

import * as cheerio from 'cheerio'
import { BaseService, Item } from 'src/connectors/baseService'
import DataLoader from 'dataloader'
import { randomText } from 'src/connectors/mockData/utils'
import { USER_ACTION } from 'src/common/enums'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count articles by a given author id (user).
   */
  countByAuthor = async (authorId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('author_id', authorId)
    return result[0].count || 0
  }

  countAppreciation = async (id: number): Promise<number> => {
    const result = await this.knex
      .select()
      .from('appreciate')
      .where('article_id', id)
      .sum('amount')
    return result[0].sum || 0
  }

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  findByAuthor = async (id: number) => {
    return await this.knex
      .select()
      .from(this.table)
      .where('author_id', id)
  }

  findByUpstream = async (upstreamId: number) => {
    return await this.knex
      .select()
      .from(this.table)
      .where('upstream_id', upstreamId)
  }

  /**
   * Find an article's appreciations by a given article id.
   */
  findAppreciationByArticleId = async (articleId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('appreciate')
      .where('article_id', articleId)
  }

  findTagsById = async (id: number): Promise<any | null> => {
    return await this.knex
      .select()
      .from('article_tag')
      .where('article_id', id)
  }

  /**
   * Find an article's subscribers by a given target id (article).
   */
  findSubscriptionByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_article')
      .where({
        target_id: targetId,
        action: USER_ACTION.subscribe
      })
  }

  /**
   * Find an article's rates by a given target id (article).
   */
  findRateByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_user')
      .where({
        target_id: targetId,
        action: USER_ACTION.rate
      })
  }

  // update an object with id and kv pairs object
  updateById = (id: string, kv: { [k: string]: any }) =>
    new Promise(resolve => {
      const index = this.items.findIndex(
        ({ id: articleId }) => id === articleId
      )
      this.items[index] = { ...this.items[index], ...kv }
      resolve(this.items[index])
    })

  // publish = (userId, article) => {}

  // TODO: replaced by actual IPFS api
  // return random string for now
  getContentFromHash = (hash: string) => `
    <html>
      <head>
        <title> ${randomText(5).join(' ')} </title>
      </head>
      <body>
        <p>${randomText(100).join(' ')}</p>
      </body>
    </html>`
}

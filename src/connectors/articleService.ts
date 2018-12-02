import * as cheerio from 'cheerio'
import { BaseService, Item } from 'src/connectors/baseService'
import DataLoader from 'dataloader'
import { randomText } from 'src/connectors/mockData/utils'

export class ArticleService extends BaseService {
  constructor() {
    super('article')
    // this.loader = new DataLoader(this.fakeFindByIds)
    this.loader = new DataLoader(this.baseFindByIds)
  }

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  findByAuthor = async (authorId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('article')
      .where('author_id', authorId)
  }

  findTagsById = async (id: number): Promise<any | null> => {
    return await this.knex
      .select()
      .from('article_tag')
      .where('article_id', id)
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

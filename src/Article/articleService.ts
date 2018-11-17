// external
import * as cheerio from 'cheerio'

// internal
import { BaseService } from '../connectors/baseService'
import { randomText } from '../connectors/mockData/utils'
export class ArticleService extends BaseService {
  constructor() {
    super('article')
  }

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  // TODO: replaced by actual dynamoDB api
  // start of db calls ->
  findByAuthor = (id: string) => {
    return new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId))
    )
  }

  countByAuthor = (id: string) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId).length)
    )

  // update an object with id and kv pairs object
  updateById = (id: string, kv: { [k: string]: any }) =>
    new Promise(resolve => {
      const index = this.items.findIndex(
        ({ id: articleId }) => id === articleId
      )
      this.items[index] = { ...this.items[index], ...kv }
      resolve(this.items[index])
    })
  // <- end of db calls

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

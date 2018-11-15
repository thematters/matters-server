// external
import * as cheerio from 'cheerio'

// internal
import { randomText, randomIds } from '../connectors/mockData'
import { BaseService } from '../connectors/baseService'
import { testSize as userTestSize } from '../User/userService'

// start of test data ->
export const testSize = 50

const createTestArticle = (id: string) => ({
  id,
  form: ['article', 'course'][Math.round(Math.random())],
  authorId: randomIds(1, userTestSize)[0],
  title: randomText(5).join(' '),
  cover: 'im a test cover',
  tags: randomText(3),
  upstreamId: randomIds(1, testSize)[0],
  downstreamIds: randomIds(5, testSize),
  relatedArticleIds: randomIds(10, testSize),
  MAT: Math.round(Math.random() * 100),
  timestamp: new Date().toISOString(),
  pinnedCommentIds: [],
  subscriberIds: randomIds(5, userTestSize), // should be moved to action table
  publishState: 'published'
})

const items = [...Array(testSize).keys()].map(i => createTestArticle(String(i)))
// <- end of test data

export class ArticleService extends BaseService {
  constructor() {
    super(items)
  }

  countWords = (html: string) =>
    cheerio
      .load(html)('body')
      .text()
      .split(' ')
      .filter(s => s !== '').length

  // TODO: replaced by actual dynamoDB api
  // start of db calls ->
  findByAuthor = (id: Array<string>) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId))
    )
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

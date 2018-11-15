import { randomText, randomIds } from '../connectors/mockData'
import { BaseService } from '../connectors/baseService'
import { testSize as userTestSize } from '../User/userService'
import { testSize as articleTestSize } from '../Article/articleService'

export const testSize = 50

const createTestComment = (id: string) => {
  let parentId: string | null = randomIds(1, testSize)[0]
  if (parentId === id || Math.round(Math.random())) {
    parentId = null
  }

  return {
    id,
    articleId: randomIds(1, articleTestSize)[0],
    text: randomText(20).join(' '),
    timestamp: new Date().toISOString(),
    authorId: randomIds(1, userTestSize)[0],
    achieved: false,
    upvotes: 0, // rely on action table?
    downvotes: 0,
    mentionIds: randomIds(2, userTestSize),
    parentId
  }
}
export const items = [...Array(testSize).keys()].map(i =>
  createTestComment(String(i))
)

export class CommentService extends BaseService {
  constructor() {
    super(items)
  }

  findByAuthor = (id: Array<string>) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId))
    )

  findByArticle = (id: string) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ articleId }) => articleId === id))
    )

  findByParent = (id: string) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ parentId }) => parentId === id))
    )
}

import { BaseService } from '../connectors/baseService'

export class CommentService extends BaseService {
  constructor() {
    super('comment')
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

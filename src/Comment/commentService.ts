import { BaseService, Item } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class CommentService extends BaseService {
  constructor() {
    super('comment')
    this.loader = new DataLoader(this.fakeFindByIds)
  }

  // start of db calls ->
  findByAuthor = (id: string): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId))
    )

  findByArticle = (id: string): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(this.items.filter(({ articleId }) => articleId === id))
    )

  findByParent = (id: string): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(this.items.filter(({ parentId }) => parentId === id))
    )

  countByAuthor = (id: string[]) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ authorId }) => id === authorId).length)
    )

  countByArticle = (id: string[]) =>
    new Promise(resolve =>
      resolve(this.items.filter(({ articleId }) => articleId === id).length)
    )
  // <- end of db calls
}

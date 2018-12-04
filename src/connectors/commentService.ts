import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class CommentService extends BaseService {
  constructor() {
    super('comment')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count comments by a given author id (user).
   */
  countByAuthor = async (authorId: number): Promise<number> => {
    const qs = await this.knex(this.table)
      .countDistinct('id')
      .where('author_id', authorId)
    return qs[0].count
  }

  /**
   * Count comments by a given article id.
   */
  countByArticle = async (articleId: number): Promise<number> => {
    return await this.knex(this.table)
      .countDistinct('id')
      .where('article_id', articleId)
  }

  /**
   * Count comments by a given comment id.
   */
  countByParent = async (commentId: number): Promise<number> => {
    return await this.knex(this.table)
      .countDistinct('id')
      .where('parent_comment_id', commentId)
  }

  /**
   * Find comments by a given author id (user).
   */
  findByAuthor = async (authorId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('author_id', authorId)
  }

  /**
   * Find comments by a given article id.
   */
  findByArticle = async (articleId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('article_id', articleId)
  }

  /**
   * Find pinned comments by a given article id.
   */
  findPinnedByArticle = async (articleId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where({ article_id: articleId, pinned: true })
  }

  /**
   * Find comments by a given comment id.
   */
  findByParent = async (commentId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('parent_comment_id', commentId)
  }
}

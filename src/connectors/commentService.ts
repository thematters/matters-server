import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'
import { USER_ACTION } from 'src/common/enums'

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
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('author_id', authorId)
    return result[0].count || 0
  }

  /**
   * Count comments by a given article id.
   */
  countByArticle = async (articleId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('article_id', articleId)
    return result[0].count || 0
  }

  /**
   * Count comments by a given comment id.
   */
  countByParent = async (commentId: number): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('parent_comment_id', commentId)
    return result[0].count || 0
  }

  /**
   * Count a comment's up votes by a given target id (comment).
   */
  countUpVoteByTargetId = async (targetId: number): Promise<any[]> => {
    const result = await this.knex('action_comment')
      .countDistinct('id')
      .where({
        target_id: targetId,
        action: USER_ACTION.upVote
      })
    return result[0].count || 0
  }

  /**
   * Count a comment's down votes by a given target id (comment).
   */
  countDownVoteByTargetId = async (targetId: number): Promise<any[]> => {
    const result = await this.knex('action_comment')
      .countDistinct('id')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote
      })
    return result[0].count || 0
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

  /**
   * Find a comment's up votes by a given target id (comment).
   */
  findUpVoteByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_comment')
      .where({
        target_id: targetId,
        action: USER_ACTION.upVote
      })
  }

  /**
   * Find a comment's down votes by a given target id (comment).
   */
  findDownVoteByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_comment')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote
      })
  }
}

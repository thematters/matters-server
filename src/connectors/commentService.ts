import DataLoader from 'dataloader'

import {
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_STATE,
  COMMENT_TYPE,
  USER_ACTION,
} from 'common/enums'
import { CommentNotFoundError } from 'common/errors'
import { BaseService } from 'connectors'
import { GQLCommentCommentsInput, GQLCommentsInput, GQLVote } from 'definitions'

interface CommentFilter {
  targetId?: string
  targetTypeId?: string
  authorId?: string
  state?: string
  parentCommentId?: string | null
}

export class CommentService extends BaseService {
  constructor() {
    super('comment')
    this.dataloader = new DataLoader(async (ids: readonly string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new CommentNotFoundError('Cannot find comment')
      }
      return result
    })
  }

  /**
   * Count comments by a given article id.
   */
  countByArticle = async (articleId: string) => {
    const result = await this.knex(this.table)
      .where({
        targetId: articleId,
        state: COMMENT_STATE.active,
        type: COMMENT_TYPE.article,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find comments by a given comment id.
   */
  findByParent = async ({
    id,
    author,
    sort,
    skip,
    take,
  }: GQLCommentCommentsInput & {
    id: string
    skip?: number
    take?: number
  }) => {
    let where: { [key: string]: string | boolean } = {
      parentCommentId: id,
    }

    let query = null
    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex.select().from(this.table).where(where).orderBy('created_at', by)

    if (author) {
      where = { ...where, authorId: author }
    }

    if (sort === 'oldest') {
      query = sortCreatedAt('asc')
    } else if (sort === 'newest') {
      query = sortCreatedAt('desc')
    } else {
      query = sortCreatedAt('desc')
    }

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /**
   * Find comments.
   */
  find = async ({
    order = 'desc',
    where,
    after,
    first,
    before,
    includeAfter = false,
    includeBefore = false,
  }: GQLCommentsInput & { where: CommentFilter; order?: string }) => {
    const query = this.knex
      .select()
      .from(this.table)
      .where(where)
      .orderBy('created_at', order)

    if (before) {
      if (includeBefore) {
        query.andWhere('id', order === 'asc' ? '<=' : '>=', before)
      } else {
        query.andWhere('id', order === 'asc' ? '<' : '>', before)
      }
    }

    if (after) {
      if (includeAfter) {
        query.andWhere('id', order === 'asc' ? '>=' : '<=', after)
      } else {
        query.andWhere('id', order === 'asc' ? '>' : '<', after)
      }
    }

    if (first) {
      query.limit(first)
    }

    return query
  }

  /**
   * Find id range with given filter
   */
  range = async (where: CommentFilter) => {
    const { count, max, min } = await this.knex
      .select()
      .from(this.table)
      .where(where)
      .min('id')
      .max('id')
      .count()
      .first()

    return {
      count: parseInt(count, 10),
      min: parseInt(min, 10),
      max: parseInt(max, 10),
    }
  }

  /*********************************
   *                               *
   *              Vote             *
   *                               *
   *********************************/
  vote = async ({
    userId,
    commentId,
    vote,
  }: {
    userId: string
    commentId: string
    vote: GQLVote
  }) => {
    const data = {
      userId,
      targetId: commentId,
      action: `${vote}_vote`,
    }

    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_comment',
    })
  }

  unvote = async ({
    userId,
    commentId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex('action_comment')
      .where({
        userId,
        targetId: commentId,
      })
      .del()

  /**
   * Count a comment's up votes by a given target id (comment).
   */
  countUpVote = async (targetId: string) => {
    const result = await this.knex('action_comment')
      .where({
        targetId,
        action: USER_ACTION.upVote,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count a comment's down votes by a given target id (comment).
   */
  countDownVote = async (targetId: string) => {
    const result = await this.knex('action_comment')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find a comment's votes by a given target id (comment).
   */
  findVotesByUserId = async ({
    userId,
    commentId: targetId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId,
      })
      .whereIn('action', [USER_ACTION.upVote, USER_ACTION.downVote])

  /**
   * Remove a comment's votes a given target id (comment).
   */
  removeVotesByUserId = async ({
    userId,
    commentId: targetId,
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId,
      })
      .whereIn('action', [USER_ACTION.upVote, USER_ACTION.downVote])
      .del()

  /*********************************
   *                               *
   *              Pin              *
   *                               *
   *********************************/
  /**
   * Find pinned comments by a given article id.
   */
  countPinnedByArticle = async ({
    articleId,
    activeOnly,
  }: {
    articleId: string
    activeOnly?: boolean
  }) => {
    const query = this.knex(this.table)
      .count()
      .where({ targetId: articleId, pinned: true })
      .first()

    if (activeOnly) {
      query.where({
        state: COMMENT_STATE.active,
        type: COMMENT_TYPE.article,
      })
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  pinLeftByArticle = async (articleId: string) => {
    const pinnedCount = await this.countPinnedByArticle({
      articleId,
      activeOnly: true,
    })
    return Math.max(ARTICLE_PIN_COMMENT_LIMIT - pinnedCount, 0)
  }
}

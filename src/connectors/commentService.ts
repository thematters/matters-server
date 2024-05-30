import type {
  GQLCommentCommentsInput,
  GQLCommentsInput,
  GQLVote,
  Comment,
  Connections,
  ValueOf,
} from 'definitions'

import {
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_STATE,
  COMMENT_TYPE,
  USER_ACTION,
} from 'common/enums'
import { BaseService } from 'connectors'

export interface CommentFilter {
  type: ValueOf<typeof COMMENT_TYPE>
  targetId: string
  targetTypeId: string
  parentCommentId?: string | null
  authorId?: string
  state?: string
}

export class CommentService extends BaseService<Comment> {
  public constructor(connections: Connections) {
    super('comment', connections)
  }

  /**
   * Count comments by a given article id.
   */
  public countByArticle = async (articleId: string) => {
    const result = await this.knex(this.table)
      .where({
        targetId: articleId,
        type: COMMENT_TYPE.article,
      })
      .whereIn('state', [COMMENT_STATE.active, COMMENT_STATE.collapsed])
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find comments by a given comment id.
   */
  public findByParent = async ({
    id,
    author,
    sort,
    skip,
    take,
  }: GQLCommentCommentsInput & {
    id: string
    skip?: number
    take?: number
  }): Promise<[Comment[], number]> => {
    let where: { [key: string]: string | boolean } = {
      parentCommentId: id,
    }

    let query = null
    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex
        .select(['*', this.knex.raw('count(1) OVER() AS total_count')])
        .from(this.table)
        .where(where)
        .orderBy('created_at', by)

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
    const records = await query

    return [records, records[0] ? parseInt(records[0].totalCount, 10) : 0]
  }

  /**
   * Find comments.
   */
  public find = async ({
    order = 'desc',
    where,
    after,
    first,
    before,
    includeAfter = false,
    includeBefore = false,
  }: GQLCommentsInput & { where: CommentFilter; order?: string }): Promise<
    [Comment[], number]
  > => {
    const subQuery = this.knexRO
      .select(this.knexRO.raw('COUNT(id) OVER() AS total_count'), '*')
      .fromRaw('comment AS outer_comment')
      .where(where)
      .andWhere((andWhereBuilder) => {
        // filter archived/banned comments when `where.state` params is not specified
        // and where.parent_comment_id is specified
        // as we don't want to show archived/banned comments for normal users, but not the case in oss
        if (!('state' in where) && 'parentCommentId' in where) {
          andWhereBuilder
            .where({ state: COMMENT_STATE.active })
            .orWhere({ state: COMMENT_STATE.collapsed })
            .orWhere((orWhereBuilder) => {
              orWhereBuilder.andWhere(
                this.knexRO.raw(
                  '(SELECT COUNT(1) FROM comment WHERE state in (?, ?) and parent_comment_id = outer_comment.id)',
                  [COMMENT_STATE.active, COMMENT_STATE.collapsed]
                ),
                '>',
                0
              )
            })
        }
      })
      .orderBy('created_at', order)

    const query = this.knexRO.from(subQuery.as('t1'))

    if (after) {
      if (includeAfter) {
        query.andWhere('id', order === 'asc' ? '>=' : '<=', after)
      } else {
        query.andWhere('id', order === 'asc' ? '>' : '<', after)
      }
    }
    if (before) {
      if (includeBefore) {
        query.andWhere('id', order === 'asc' ? '<=' : '>=', before)
      } else {
        query.andWhere('id', order === 'asc' ? '<' : '>', before)
      }
    }
    if (first) {
      query.limit(first)
    }
    const records = await query
    return [records, +records[0]?.totalCount || 0]
  }

  /*********************************
   *                               *
   *              Vote             *
   *                               *
   *********************************/
  public vote = async ({
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
      data: data,
      table: 'action_comment',
    })
  }

  public unvote = async ({
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
  public countUpVote = async (targetId: string) => {
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
  public countDownVote = async (targetId: string) => {
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
  public findVotesByUserId = async ({
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
  public removeVotesByUserId = async ({
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
  private countPinnedByArticle = async ({
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

  public pinLeftByArticle = async (articleId: string) => {
    const pinnedCount = await this.countPinnedByArticle({
      articleId,
      activeOnly: true,
    })
    return Math.max(ARTICLE_PIN_COMMENT_LIMIT - pinnedCount, 0)
  }
}

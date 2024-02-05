import type {
  GQLCommentCommentsInput,
  GQLCommentsInput,
  GQLVote,
  Comment,
  Connections,
  Item,
} from 'definitions'

import DataLoader from 'dataloader'

import {
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_STATE,
  COMMENT_TYPE,
  USER_ACTION,
} from 'common/enums'
import { CommentNotFoundError } from 'common/errors'
import { BaseService } from 'connectors'

interface CommentFilter {
  targetId?: string
  targetTypeId?: string
  authorId?: string
  state?: string
  parentCommentId?: string | null
}

export class CommentService extends BaseService {
  public dataloader: DataLoader<string, Item>

  public constructor(connections: Connections) {
    super('comment', connections)
    this.dataloader = new DataLoader(async (ids: readonly string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new CommentNotFoundError('Cannot find comment')
      }
      return result
    })
  }

  public loadById = async (id: string): Promise<Comment> =>
    this.dataloader.load(id) as Promise<Comment>
  public loadByIds = async (ids: string[]): Promise<Comment[]> =>
    this.dataloader.loadMany(ids) as Promise<Comment[]>

  /**
   * Count comments by a given article id.
   */
  public countByArticle = async (articleId: string) => {
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
  }): Promise<[any[], number]> => {
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
    Comment[]
  > => {
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
  public range = async (where: CommentFilter) => {
    const { count, max, min } = (await this.knex
      .select()
      .from(this.table)
      .where(where)
      .min('id')
      .max('id')
      .count()
      .first()) as Record<string, any>

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
      data: { updatedAt: new Date(), ...data },
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

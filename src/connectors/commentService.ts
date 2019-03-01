import DataLoader from 'dataloader'
import { v4 } from 'uuid'
import { uniq } from 'lodash'

import {
  USER_ACTION,
  ARTICLE_PIN_COMMENT_LIMIT,
  COMMENT_STATE
} from 'common/enums'
import { BaseService } from './baseService'
import { CommentNotFoundError } from 'common/errors'

import {
  GQLCommentsInput,
  GQLVote,
  GQLCommentCommentsInput
} from 'definitions/schema'

export class CommentService extends BaseService {
  constructor() {
    super('comment')
    this.dataloader = new DataLoader(async (ids: string[]) => {
      const result = await this.baseFindByIds(ids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new CommentNotFoundError('Cannot find comment')
      }
      return result
    })
    this.uuidLoader = new DataLoader(async (uuids: string[]) => {
      const result = await this.baseFindByUUIDs(uuids)

      if (result.findIndex((item: any) => !item) >= 0) {
        throw new CommentNotFoundError('Cannot find comment')
      }

      return result
    })
  }

  create = async ({
    authorId,
    articleId,
    parentCommentId,
    mentionedUserIds = [],
    content,
    quotationStart,
    quotationEnd,
    quotationContent,
    replyTo
  }: {
    [key: string]: any
  }) => {
    // create comment
    const comemnt = await this.baseCreate({
      uuid: v4(),
      authorId,
      articleId,
      parentCommentId,
      content,
      quotationStart,
      quotationEnd,
      quotationContent,
      replyTo
    })
    // create mentions
    const mentionsDataItems = mentionedUserIds.map((userId: string) => ({
      commentId: comemnt.id,
      userId
    }))
    await this.baseBatchCreate(mentionsDataItems, 'comment_mentioned_user')
    return comemnt
  }

  update = async ({
    id,
    articleId,
    parentCommentId,
    mentionedUserIds = [],
    content
  }: {
    [key: string]: any
  }) => {
    // update comment
    const comemnt = await this.baseUpdate(id, {
      articleId,
      parentCommentId,
      content,
      updatedAt: new Date()
    })
    // remove exists mentions
    await this.knex('comment_mentioned_user')
      .where({ commentId: id })
      .del()
    // re-create mentions
    const mentionsDataItems = mentionedUserIds.map((userId: string) => ({
      commentId: comemnt.id,
      userId
    }))
    await this.baseBatchCreate(mentionsDataItems, 'comment_mentioned_user')
    return comemnt
  }

  /**
   * Count comments by a given author id (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .where({ authorId, state: COMMENT_STATE.active })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count comments by a given article id.
   */
  countByArticle = async (articleId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .where({ articleId, state: COMMENT_STATE.active })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find comments by a given author id (user).
   */
  findByAuthor = async (authorId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId, state: COMMENT_STATE.active })
      .orderBy('id', 'desc')

  /**
   * Find comments by a given comment id.
   */
  findByParent = async ({
    id,
    author,
    sort
  }: GQLCommentCommentsInput & { id: string }): Promise<any[]> => {
    let where: { [key: string]: string | boolean } = {
      parentCommentId: id,
      state: COMMENT_STATE.active // filter inactive descendant comments
    }

    let query = null
    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex
        .select()
        .from(this.table)
        .where(where)
        .orderBy('created_at', by)

    if (author) {
      where = { ...where, authorId: author }
    }

    if (sort == 'upvotes') {
      query = this.knex('comment')
        .select('comment.*')
        .countDistinct('votes.user_id as upvotes')
        .leftJoin(
          this.knex
            .select('target_id', 'user_id')
            .from('action_comment')
            .as('votes'),
          'votes.target_id',
          'comment.id'
        )
        .groupBy('comment.id')
        .where(where)
        .orderBy('upvotes', 'desc')
    } else if (sort === 'oldest') {
      query = sortCreatedAt('asc')
    } else if (sort === 'newest') {
      query = sortCreatedAt('desc')
    } else {
      query = sortCreatedAt('desc')
    }

    return query
  }

  /**
   * Find comments by a given article id.
   */
  findByArticle = async ({
    id,
    author,
    sort,
    parent
  }: GQLCommentsInput & { id: string }) => {
    let where: { [key: string]: string | boolean } = { articleId: id }

    let query = null
    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex
        .select()
        .from(this.table)
        .where(where)
        .orderBy('created_at', by)

    if (author) {
      where = {
        ...where,
        authorId: author,
        // filter inactive comments of author, used in UserComments page
        state: COMMENT_STATE.active
      }
    }

    if (sort == 'upvotes') {
      query = this.knex('comment')
        .select('comment.*')
        .countDistinct('votes.user_id as upvotes')
        .leftJoin(
          this.knex
            .select('target_id', 'user_id')
            .from('action_comment')
            .as('votes'),
          'votes.target_id',
          'comment.id'
        )
        .groupBy('comment.id')
        .where(where)
        .orderBy('upvotes', 'desc')
    } else if (sort === 'oldest') {
      query = sortCreatedAt('asc')
    } else if (sort === 'newest') {
      query = sortCreatedAt('desc')
    } else {
      query = sortCreatedAt('desc')
    }

    if (parent) {
      query = query.whereNull('parent_comment_id')
    }

    return query
  }

  /*********************************
   *                               *
   *              Vote             *
   *                               *
   *********************************/
  vote = async ({
    userId,
    commentId,
    vote
  }: {
    userId: string
    commentId: string
    vote: GQLVote
  }) => {
    const data = {
      userId,
      targetId: commentId,
      action: `${vote}_vote`
    }

    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_comment'
    })
  }

  unvote = async ({
    userId,
    commentId
  }: {
    userId: string
    commentId: string
  }) =>
    this.knex('action_comment')
      .where({
        userId,
        targetId: commentId
      })
      .del()

  /**
   * Count a comment's up votes by a given target id (comment).
   */
  countUpVote = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_comment')
      .where({
        targetId,
        action: USER_ACTION.upVote
      })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count a comment's down votes by a given target id (comment).
   */
  countDownVote = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_comment')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote
      })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find a comment's votes by a given target id (comment).
   */
  findVotesByUserId = async ({
    userId,
    commentId: targetId
  }: {
    userId: string
    commentId: string
  }): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId
      })
      .whereIn('action', [USER_ACTION.upVote, USER_ACTION.downVote])

  /**
   * Remove a comment's votes a given target id (comment).
   */
  removeVotesByUserId = async ({
    userId,
    commentId: targetId
  }: {
    userId: string
    commentId: string
  }): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_comment')
      .where({
        userId,
        targetId
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
  findPinnedByArticle = async (articleId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ articleId, pinned: true })

  countPinnedByArticle = async ({
    articleId,
    activeOnly
  }: {
    articleId: string
    activeOnly?: boolean
  }): Promise<number> => {
    let qs = this.knex(this.table)
      .count()
      .where({ articleId, pinned: true })
      .first()

    if (activeOnly) {
      qs = qs.where({ state: COMMENT_STATE.active })
    }

    const result = await qs
    return parseInt(result.count, 10)
  }

  pinLeftByArticle = async (articleId: string) => {
    const pinnedCount = await this.countPinnedByArticle({
      articleId: articleId,
      activeOnly: true
    })
    return Math.max(ARTICLE_PIN_COMMENT_LIMIT - pinnedCount, 0)
  }

  /*********************************
   *                               *
   *            Mention            *
   *                               *
   *********************************/
  /**
   * Find a comment's mentioned users by a given comment id.
   */
  findMentionedUsers = async (commentId: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from('comment_mentioned_user')
      .where({
        commentId
      })
  }

  /*********************************
   *                               *
   *             Report            *
   *                               *
   *********************************/
  /**
   * User report an comment
   */
  report = async ({
    commentId,
    userId,
    category,
    description,
    contact,
    assetIds
  }: {
    commentId: string
    userId?: string | null
    category: string
    description?: string
    contact?: string
    assetIds?: string[]
  }): Promise<void> => {
    // create report
    const { id: reportId } = await this.baseCreate(
      {
        userId,
        commentId,
        category,
        description,
        contact
      },
      'report'
    )
    // create report assets
    if (!assetIds || assetIds.length <= 0) {
      return
    }
    const reportAssets = assetIds.map(assetId => ({
      reportId,
      assetId
    }))
    await this.baseBatchCreate(reportAssets, 'report_asset')
  }
}

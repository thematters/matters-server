import DataLoader from 'dataloader'
import { v4 } from 'uuid'

import { BATCH_SIZE, USER_ACTION } from 'common/enums'
import { BaseService } from './baseService'

import { GQLCommentsInput, GQLVote } from 'definitions/schema'

export class CommentService extends BaseService {
  constructor() {
    super('comment')
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  create = async ({
    authorId,
    articleId,
    parentCommentId,
    mentionedUserIds = [],
    content
  }: {
    [key: string]: any
  }) => {
    // create comment
    const comemnt = await this.baseCreate({
      uuid: v4(),
      authorId,
      articleId,
      parentCommentId,
      content
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
    const comemnt = await this.baseUpdateById(id, {
      articleId,
      parentCommentId,
      content
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

  vote = async ({
    userId,
    commentId,
    vote
  }: {
    userId: string
    commentId: string
    vote: GQLVote
  }) =>
    this.baseCreate(
      {
        userId,
        targetId: commentId,
        action: `${vote}_vote`
      },
      'action_comment'
    )

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
   * Count comments by a given author id (user).
   */
  countByAuthor = async (authorId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ authorId })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count comments by a given article id.
   */
  countByArticle = async (articleId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ articleId })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count comments by a given comment id.
   */
  countByParent = async (commentId: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('parent_comment_id', commentId)
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count a comment's up votes by a given target id (comment).
   */
  countUpVote = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_comment')
      .countDistinct('id')
      .where({
        targetId,
        action: USER_ACTION.upVote
      })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count a comment's down votes by a given target id (comment).
   */
  countDownVote = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_comment')
      .countDistinct('id')
      .where({
        target_id: targetId,
        action: USER_ACTION.downVote
      })
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
      .where({ authorId })

  /**
   * Find comments by a given author id (user) in batches.
   */
  findByAuthorInBatch = async (
    authorId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find articles ids by comment author id (user) in batches.
   */
  findArticleByAuthorInBatch = async (
    authorId: string,
    offset = 0,
    limit = BATCH_SIZE
  ): Promise<string[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ authorId })
      .distinct()
      .pluck('article_id')
      .offset(offset)
      .limit(limit)

  /**
   * Find comments by a given article id in batches.
   */
  findByArticle = async ({
    id,
    author,
    quote,
    sort,
    offset = 0,
    limit = BATCH_SIZE
  }: GQLCommentsInput & { id: string }) => {
    let where: { [key: string]: string | boolean } = { articleId: id }
    if (author) {
      where = { ...where, authorId: author }
    }
    if (quote) {
      where = { ...where, quote }
    }

    const sortCreatedAt = (by: 'desc' | 'asc') =>
      this.knex
        .select()
        .from(this.table)
        .where(where)
        .orderBy('created_at', by)
        .offset(offset)
        .limit(limit)

    if (sort == 'upvotes') {
      return this.knex('comment')
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
      return sortCreatedAt('asc')
    } else if (sort === 'newest') {
      return sortCreatedAt('desc')
    } else {
      return sortCreatedAt('desc')
    }
  }

  /**
   * Find pinned comments by a given article id.
   */
  findPinnedByArticle = async (articleId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ articleId, pinned: true })

  /**
   * Find comments by a given comment id.
   */
  findByParent = async (commentId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where('parent_comment_id', commentId)

  /**
   * Find a comment's up votes by a given target id (comment).
   */
  findUpVotes = async (targetId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_comment')
      .where({
        targetId,
        action: USER_ACTION.upVote
      })

  /**
   * Find a comment's down votes by a given target id (comment).
   */
  findDownVotes = async (targetId: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_comment')
      .where({
        targetId,
        action: USER_ACTION.downVote
      })
  }

  /**
   * Find a comment's vote by a given target id (comment).
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

  /**
   * User report an comment
   */
  report = async (
    commentId: string,
    userId: string,
    category: string,
    description: string,
    assetIds: string[] | undefined
  ): Promise<void> => {
    // create report
    const { id: reportId } = await this.baseCreate(
      {
        userId,
        commentId,
        category,
        description
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

import type {
  Comment,
  Context,
  GQLMutationResolvers,
} from '#definitions/index.js'
import type { GlobalId } from '#definitions/nominal.js'
import type { Knex } from 'knex'

import {
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  USER_FEATURE_FLAG_TYPE,
  USER_STATE,
} from '#common/enums/index.js'
import {
  CommentNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { v4 } from 'uuid'

const allowedCommentStates = [COMMENT_STATE.active, COMMENT_STATE.collapsed]
const allowedCommentTypes = [COMMENT_TYPE.article, COMMENT_TYPE.moment]

type CommunityWatchRemoveCommentReason = 'porn_ad' | 'spam_ad'

const resolver = async (
  _: unknown,
  {
    input: { id: globalId, reason },
  }: {
    input: { id: GlobalId; reason: CommunityWatchRemoveCommentReason }
  },
  {
    viewer,
    dataSources: {
      atomService,
      articleService,
      userService,
      notificationService,
      connections,
    },
  }: Context
) => {
  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const featureFlags = await userService.findFeatureFlags(viewer.id)
  const isCommunityWatch = featureFlags
    .map(({ type: featureFlagType }) => featureFlagType)
    .includes(USER_FEATURE_FLAG_TYPE.communityWatch)
  if (!isCommunityWatch) {
    throw new ForbiddenError('viewer is not a Community Watch member')
  }

  const { type: targetType, id: commentId } = fromGlobalId(globalId)
  if (targetType !== NODE_TYPES.Comment) {
    throw new UserInputError('target must be a comment')
  }

  const comment = await atomService.commentIdLoader.load(commentId)
  if (!allowedCommentTypes.includes(comment.type)) {
    throw new UserInputError(
      'Community Watch can only remove article and moment comments'
    )
  }

  const target =
    comment.type === COMMENT_TYPE.article
      ? await atomService.articleIdLoader.load(comment.targetId)
      : await atomService.momentIdLoader.load(comment.targetId)
  const articleVersion =
    comment.type === COMMENT_TYPE.article
      ? await articleService.loadLatestArticleVersion(comment.targetId)
      : undefined

  const now = new Date()
  const updatedComment = await connections.knex.transaction(
    async (trx: Knex.Transaction) => {
      const activeAction = await trx('community_watch_action')
        .select('id')
        .where({ commentId, actionState: 'active' })
        .first()
      if (activeAction) {
        throw new UserInputError(
          'comment already has an active Community Watch action'
        )
      }

      const freshComment = await trx<Comment>('comment')
        .select()
        .where({ id: commentId })
        .forUpdate()
        .first()
      if (!freshComment) {
        throw new CommentNotFoundError('comment not found')
      }
      if (!allowedCommentTypes.includes(freshComment.type)) {
        throw new UserInputError(
          'Community Watch can only remove article and moment comments'
        )
      }
      if (!allowedCommentStates.includes(freshComment.state)) {
        throw new UserInputError('comment is not removable by Community Watch')
      }

      await trx('community_watch_action').insert({
        uuid: v4(),
        commentId: freshComment.id,
        commentType: freshComment.type,
        targetType: freshComment.type,
        targetId: freshComment.targetId,
        targetTitle:
          freshComment.type === COMMENT_TYPE.article
            ? articleVersion?.title || null
            : null,
        targetShortHash: 'shortHash' in target ? target.shortHash : null,
        reason,
        actorId: viewer.id,
        commentAuthorId: freshComment.authorId,
        originalContent: freshComment.content,
        originalState: freshComment.state,
        contentExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      })

      const [newComment] = await trx('comment')
        .where({ id: freshComment.id })
        .update({
          state: COMMENT_STATE.banned,
          updatedAt: now,
        })
        .returning('*')

      return newComment
    }
  )

  notificationService.trigger({
    event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
    entities: [
      { type: 'target', entityTable: 'comment', entity: updatedComment },
    ],
    recipientId: updatedComment.authorId,
  })

  await invalidateFQC({
    node: {
      id: updatedComment.targetId,
      type:
        updatedComment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : NODE_TYPES.Moment,
    },
    redis: connections.redis,
  })

  return updatedComment
}

export default resolver as GQLMutationResolvers['communityWatchRemoveComment']

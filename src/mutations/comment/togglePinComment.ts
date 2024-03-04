import type { GQLMutationResolvers, Circle } from 'definitions'

import {
  CACHE_KEYWORD,
  COMMENT_TYPE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
} from 'common/enums'
import {
  ActionLimitExceededError,
  AuthenticationError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: Exclude<
  GQLMutationResolvers['togglePinComment'],
  undefined
> = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService, commentService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  // check target
  let circle: Circle | undefined = undefined
  if (comment.type === COMMENT_TYPE.article) {
    // only article author can pin his/her comment
    if (comment.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
    const article = await atomService.articleIdLoader.load(comment.targetId)
    if (article.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }
  } else {
    circle = await atomService.circleIdLoader.load(comment.targetId)
    const targetAuthor = circle.owner
    const isTargetAuthor = targetAuthor === viewer.id
    if (!isTargetAuthor) {
      throw new ForbiddenError('viewer has no permission')
    }
  }

  // determine action
  let action: 'pin' | 'unpin'
  if (enabled === undefined) {
    const pinned = await atomService.findFirst({
      table: 'comment',
      where: {
        id: dbId,
        pinned: true,
      },
    })
    action = pinned ? 'unpin' : 'pin'
  } else {
    action = enabled ? 'pin' : 'unpin'
  }

  // run action
  let pinnedComment
  if (action === 'pin') {
    // limits on article
    if (comment.type === COMMENT_TYPE.article) {
      const pinLeft = await commentService.pinLeftByArticle(comment.targetId)
      if (pinLeft <= 0) {
        throw new ActionLimitExceededError('reach pin limit')
      }
    }

    // unpin all circle broadcast first
    if (circle) {
      await atomService.update({
        table: 'comment',
        where: {
          targetId: circle.id,
          type: COMMENT_TYPE.circleBroadcast,
        },
        data: {
          pinned: false,
          pinnedAt: null,
        },
      })
    }

    // pin target comment
    pinnedComment = await atomService.update({
      table: 'comment',
      where: { id: dbId },
      data: {
        pinned: true,
        pinnedAt: new Date(),
      },
    })

    // trigger notifications
    notificationService.trigger({
      event: DB_NOTICE_TYPE.comment_pinned,
      actorId: viewer.id,
      recipientId: comment.authorId,
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
    })
  } else {
    pinnedComment = await atomService.update({
      table: 'comment',
      where: { id: dbId },
      data: {
        pinned: false,
        updatedAt: new Date(),
        pinnedAt: null,
      },
    })
  }

  // invalidate extra nodes
  ;(pinnedComment as unknown as Comment & { [CACHE_KEYWORD]: any })[
    CACHE_KEYWORD
  ] = [
    {
      id: comment.targetId,
      type:
        comment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : NODE_TYPES.Circle,
    },
  ]

  return pinnedComment
}

export default resolver

import {
  CACHE_KEYWORD,
  COMMENT_TYPE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
} from 'common/enums/index.js'
import {
  ActionLimitExceededError,
  AuthenticationError,
  ForbiddenError,
} from 'common/errors.js'
import { fromGlobalId } from 'common/utils/index.js'
import { MutationToTogglePinCommentResolver } from 'definitions'

const resolver: MutationToTogglePinCommentResolver = async (
  _,
  { input: { id, enabled } },
  {
    viewer,
    dataSources: {
      atomService,
      commentService,
      articleService,
      notificationService,
    },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.dataloader.load(dbId)

  // check target
  let article: any
  let circle: any
  let targetAuthor: any
  if (comment.type === COMMENT_TYPE.article) {
    article = await articleService.dataloader.load(comment.targetId)
    targetAuthor = article.authorId
  } else {
    circle = await atomService.circleIdLoader.load(comment.targetId)
    targetAuthor = circle.owner
  }

  // check permission
  const isTargetAuthor = targetAuthor === viewer.id
  if (!isTargetAuthor) {
    throw new ForbiddenError('viewer has no permission')
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
    action = !!pinned ? 'unpin' : 'pin'
  } else {
    action = enabled ? 'pin' : 'unpin'
  }

  // run action
  let pinnedComment
  if (action === 'pin') {
    // limits on article
    if (article) {
      const pinLeft = await commentService.pinLeftByArticle(article.id)
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
          updatedAt: new Date(),
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
        updatedAt: new Date(),
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
  pinnedComment[CACHE_KEYWORD] = [
    {
      id: article ? article.id : circle.id,
      type: article ? NODE_TYPES.Article : NODE_TYPES.Circle,
    },
  ]

  return pinnedComment
}

export default resolver

import { DB_NOTICE_TYPE } from 'common/enums'
import {
  ActionLimitExceededError,
  AuthenticationError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
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
  const [articleTypeId, circleTypeId] = (
    await atomService.findMany({
      table: 'entity_type',
      whereIn: ['table', ['article', 'circle']],
    })
  ).map((types) => types.id)
  const isTargetArticle = articleTypeId === comment.targetTypeId
  const isTargetCircle = circleTypeId === comment.targetTypeId

  let article: any
  let circle: any
  let targetAuthor: any
  if (isTargetArticle) {
    article = await articleService.dataloader.load(comment.targetId)
    targetAuthor = article.authorId
  } else if (isTargetCircle) {
    circle = await articleService.dataloader.load(comment.targetId)
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
    const pinned = await commentService.findPinned(dbId)
    action = !!pinned ? 'unpin' : 'pin'
  } else {
    action = enabled ? 'pin' : 'unpin'
  }

  // run action
  let pinnedComment
  if (action === 'pin') {
    if (article) {
      const pinLeft = await commentService.pinLeftByArticle(article.id)
      if (pinLeft <= 0) {
        throw new ActionLimitExceededError('reach pin limit')
      }
    }

    // check is pinned before
    if (comment.pinned) {
      return comment
    }

    pinnedComment = await commentService.togglePinned({
      commentId: dbId,
      pinned: true,
    })

    // trigger notifications
    notificationService.trigger({
      event: DB_NOTICE_TYPE.comment_pinned,
      actorId: viewer.id,
      recipientId: comment.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'comment',
          entity: comment,
        },
      ],
    })
  } else {
    pinnedComment = commentService.togglePinned({
      commentId: dbId,
      pinned: false,
    })
  }

  return pinnedComment
}

export default resolver

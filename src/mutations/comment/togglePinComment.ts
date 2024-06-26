import type { GQLMutationResolvers, Article, Circle } from 'definitions'

import { CACHE_KEYWORD, COMMENT_TYPE, NODE_TYPES } from 'common/enums'
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
  { viewer, dataSources: { atomService, commentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  // check target
  let article: Article | undefined = undefined
  let circle: Circle | undefined = undefined
  let targetAuthor: string
  if (comment.type === COMMENT_TYPE.article) {
    article = await atomService.articleIdLoader.load(comment.targetId)
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
    action = pinned ? 'unpin' : 'pin'
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
      id: article ? article.id : circle?.id,
      type: article ? NODE_TYPES.Article : NODE_TYPES.Circle,
    },
  ]

  return pinnedComment
}

export default resolver

import type {
  GQLMutationResolvers,
  Circle,
  Article,
  ValueOf,
} from 'definitions'

import {
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['updateCommentsState'] = async (
  _,
  { input: { ids, state } },
  { viewer, dataSources: { atomService, commentService, notificationService } }
) => {
  const dbIds = (ids || []).map((id) => fromGlobalId(id).id)

  const updateCommentState = async (id: string) => {
    const comment = await atomService.commentIdLoader.load(id)

    // check target
    let article: Article
    let circle: Circle
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
    const isValidFromState = (
      [COMMENT_STATE.active, COMMENT_STATE.collapsed] as Array<
        ValueOf<typeof COMMENT_STATE>
      >
    ).includes(comment.state)
    const isValidToState = (
      [COMMENT_STATE.active, COMMENT_STATE.collapsed] as Array<
        ValueOf<typeof COMMENT_STATE>
      >
    ).includes(state)

    if (!isTargetAuthor || !isValidFromState || !isValidToState) {
      throw new ForbiddenError(
        `viewer has no permission on ${toGlobalId({
          type: NODE_TYPES.Comment,
          id,
        })}`
      )
    }

    const newComment = await commentService.baseUpdate(comment.id, {
      state,
      updatedAt: new Date(),
    })

    return newComment
  }

  // bulk update to active or collapsed for article author
  if (!viewer.hasRole('admin')) {
    const authorComments = await Promise.all(
      dbIds.map((id) => updateCommentState(id))
    )

    return authorComments
  }

  // bulk update for admin
  const comments = await commentService.baseBatchUpdate(dbIds, {
    state,
    updatedAt: new Date(),
  })

  // trigger notification
  if (state === COMMENT_STATE.banned) {
    await Promise.all(
      comments.map(async (comment) => {
        const user = await atomService.userIdLoader.load(comment.authorId)

        notificationService.trigger({
          event: OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned,
          entities: [
            { type: 'target', entityTable: 'comment', entity: comment },
          ],
          recipientId: user.id,
        })
      })
    )
  }

  return comments
}

export default resolver

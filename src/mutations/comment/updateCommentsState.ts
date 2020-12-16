import { COMMENT_STATE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToUpdateCommentsStateResolver } from 'definitions'

const resolver: MutationToUpdateCommentsStateResolver = async (
  _,
  { input: { ids, state } },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      commentService,
      notificationService,
    },
  }
) => {
  const dbIds = (ids || []).map((id) => fromGlobalId(id).id)

  // bulk update to active or collapsed for article author
  if (!viewer.hasRole('admin')) {
    const authorComments = await Promise.all(
      dbIds.map(async (commentDbId) => {
        const comment = await commentService.dataloader.load(commentDbId)
        const article = await articleService.dataloader.load(comment.articleId)
        const isArticleAuthor = viewer.id === article.authorId
        const isValidFromState =
          [COMMENT_STATE.active, COMMENT_STATE.collapsed].indexOf(
            comment.state
          ) >= 0
        const isValidToState =
          [COMMENT_STATE.active, COMMENT_STATE.collapsed].indexOf(state) >= 0

        if (!isArticleAuthor || !isValidFromState || !isValidToState) {
          throw new ForbiddenError(
            `viewer has no permission on ${toGlobalId({
              type: 'Comment',
              id: commentDbId,
            })}`
          )
        }

        const newComment = await commentService.baseUpdate(comment.id, {
          state,
          updatedAt: new Date(),
        })

        return newComment
      })
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
        const user = await userService.dataloader.load(comment.authorId)

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

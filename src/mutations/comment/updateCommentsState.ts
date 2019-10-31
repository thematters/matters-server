import { fromGlobalId } from 'common/utils'
import { MutationToUpdateCommentsStateResolver } from 'definitions'

const resolver: MutationToUpdateCommentsStateResolver = async (
  _,
  { input: { ids, state } },
  { viewer, dataSources: { userService, commentService, notificationService } }
) => {
  const dbIds = (ids || []).map(id => fromGlobalId(id).id)

  const comments = await commentService.baseBatchUpdate(dbIds, {
    state,
    updatedAt: new Date()
  })

  // trigger notification
  if (state === 'banned') {
    await Promise.all(
      comments.map(async comment => {
        const user = await userService.dataloader.load(comment.authorId)

        notificationService.trigger({
          event: 'comment_banned',
          entities: [
            { type: 'target', entityTable: 'comment', entity: comment }
          ],
          recipientId: user.id
        })
      })
    )
  }

  return comments
}

export default resolver

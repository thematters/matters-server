import { fromGlobalId } from 'common/utils'
import { MutationToUpdateCommentStateResolver } from 'definitions'

const resolver: MutationToUpdateCommentStateResolver = async (
  _,
  { input: { id, state } },
  { viewer, dataSources: { userService, commentService, notificationService } }
) => {
  const { id: dbId } = fromGlobalId(id)

  const comment = await commentService.baseUpdate(dbId, {
    state,
    updatedAt: new Date()
  })

  // trigger notification
  if (state === 'banned') {
    const user = await userService.dataloader.load(comment.authorId)
    notificationService.trigger({
      event: 'comment_banned',
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
      recipientId: user.id
    })
  }

  return comment
}

export default resolver

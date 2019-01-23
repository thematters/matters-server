import { MutationToVoteCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { AuthenticationError } from 'common/errors'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { id, vote } },
  {
    viewer,
    dataSources: { articleService, commentService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)

  await commentService.vote({ commentId: dbId, vote, userId: viewer.id })
  const comment = await commentService.dataloader.load(dbId)
  const article = await articleService.dataloader.load(comment.articleId)

  // trigger notifications
  if (vote === 'up') {
    notificationService.trigger({
      event: 'comment_new_upvote',
      recipientId: comment.authorId,
      actorId: viewer.id,
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }]
    })
  }
  notificationService.trigger({
    event: 'article_updated',
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })

  return comment
}

export default resolver

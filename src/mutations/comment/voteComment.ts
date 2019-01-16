import { AuthenticationError } from 'apollo-server'
import { MutationToVoteCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { id, vote } },
  {
    viewer,
    dataSources: { articleService, commentService, notificationService }
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)

  // check is voted before
  const voted = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: dbId
  })
  if (voted && voted.length > 0) {
    await commentService.removeVotesByUserId({
      userId: viewer.id,
      commentId: dbId
    })
  }

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

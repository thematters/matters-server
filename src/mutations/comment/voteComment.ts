import { MutationToVoteCommentResolver, Context } from 'definitions'
import { fromGlobalId, toGlobalId } from 'common/utils'
import pubsub from 'common/pubsub'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { commentId, vote } },
  { viewer, dataSources: { commentService } }: Context
) => {
  console.log({ viewer })
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  console.log({ commentId, vote })
  const { id: dbId } = fromGlobalId(commentId)

  try {
    await commentService.vote({ commentId: dbId, vote, userId: viewer.id })
    const comment = await commentService.dataloader.load(dbId)
    pubsub.publish(commentId, comment)
    return comment
  } catch (err) {
    throw err
  }
}

export default resolver

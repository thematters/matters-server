import { MutationToVoteCommentResolver } from 'definitions'
import { fromGlobalId, toGlobalId } from 'common/utils'
import pubsub from 'common/pubsub'

const resolver: MutationToVoteCommentResolver = async (
  _,
  { input: { commentId, vote } },
  { viewer, dataSources: { commentService } }
) => {
  if (!viewer.id) {
    throw new Error('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(commentId)

  try {
    await commentService.vote({ commentId: dbId, vote })
    const comment = await commentService.loader.load(dbId)
    pubsub.publish(commentId, comment)
    return comment
  } catch (err) {
    throw err
  }
}

export default resolver

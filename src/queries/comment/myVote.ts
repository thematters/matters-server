import { Resolver } from 'definitions'

const voteMap = {
  up_vote: 'up',
  down_vote: 'down'
}

const resolver: Resolver = async (
  { id },
  _,
  { viewer, dataSources: { commentService } }
) => {
  if (!viewer.id) {
    return null
  }

  const votes = await commentService.findVotesByUserId({
    userId: viewer.id,
    targetId: id
  })
  const action: 'up_vote' | 'down_vote' = votes[0] && votes[0].action

  if (!action) {
    return null
  }

  return voteMap[action]
}

export default resolver

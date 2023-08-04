import type { GQLCommentResolvers } from 'definitions'

const voteMap = {
  up_vote: 'up',
  down_vote: 'down',
} as const

const resolver: GQLCommentResolvers['myVote'] = async (
  { id },
  _,
  { viewer, dataSources: { commentService } }
) => {
  if (!viewer.id) {
    return null
  }

  const votes = await commentService.findVotesByUserId({
    userId: viewer.id,
    commentId: id,
  })
  const action: 'up_vote' | 'down_vote' = votes[0] && votes[0].action

  if (!action) {
    return null
  }

  return voteMap[action]
}

export default resolver

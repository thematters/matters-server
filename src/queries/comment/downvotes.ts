import { CommentToDownvotesResolver } from 'definitions'

const resolver: CommentToDownvotesResolver = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countDownVote(id)

export default resolver

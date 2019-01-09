import { CommentToUpvotesResolver } from 'definitions'

const resolver: CommentToUpvotesResolver = (
  { id, upvotes },
  _,
  { dataSources: { commentService } }
) => parseInt(upvotes, 10) || commentService.countUpVote(id)

export default resolver

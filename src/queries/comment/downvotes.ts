import { CommentToDownvotesResolver } from 'definitions'

const resolver: CommentToDownvotesResolver = (
  { id },
  _,
  { dataSources: { commentService } }
) => 0

export default resolver

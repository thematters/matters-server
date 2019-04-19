import { CommentToMentionsResolver } from 'definitions'

const resolver: CommentToMentionsResolver = async (
  { id },
  _,
  { dataSources: { userService, commentService } }
) => {
  return []
}

export default resolver

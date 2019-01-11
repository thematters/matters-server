import { UserStatusToCommentCountResolver } from 'definitions'

const resolver: UserStatusToCommentCountResolver = async (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countByAuthor(id)

export default resolver

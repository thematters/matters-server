import { CommentToAuthorResolver } from 'definitions'

const resolver: CommentToAuthorResolver = (
  { authorId },
  _,
  { dataSources: { userService } }
) => userService.dataloader.load(authorId)

export default resolver

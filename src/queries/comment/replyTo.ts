import { CommentToReplyToResolver } from 'definitions'

const resolver: CommentToReplyToResolver = (
  { replyTo },
  _,
  { dataSources: { userService } }
) => (replyTo ? userService.dataloader.load(replyTo) : null)

export default resolver

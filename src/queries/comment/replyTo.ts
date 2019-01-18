import { CommentToReplyToResolver } from 'definitions'

const resolver: CommentToReplyToResolver = (
  { replyTo },
  _,
  { dataSources: { commentService } }
) => (replyTo ? commentService.dataloader.load(replyTo) : null)

export default resolver

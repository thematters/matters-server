import type { GQLCommentToReplyResolvers } from 'definitions'

const resolver: GQLCommentToReplyResolvers[''] = (
  { replyTo },
  _,
  { dataSources: { commentService } }
) => (replyTo ? commentService.dataloader.load(replyTo) : null)

export default resolver

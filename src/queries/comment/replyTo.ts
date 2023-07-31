import type { GQLCommentToReplyResolvers } from 'definitions'

const resolver: GQLCommentToReplyResolvers[''] = (
  { replyTo },
  _,
  { dataSources: { commentService } }
) => (replyTo ? commentService.loadById(replyTo) : null)

export default resolver

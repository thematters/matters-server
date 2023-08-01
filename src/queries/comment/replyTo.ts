import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['replyTo'] = (
  { replyTo },
  _,
  { dataSources: { commentService } }
) => (replyTo ? commentService.loadById(replyTo) : null)

export default resolver

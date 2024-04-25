import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['replyTo'] = (
  { replyTo },
  _,
  { dataSources: { atomService } }
) => (replyTo ? atomService.commentIdLoader.load(replyTo) : null)

export default resolver

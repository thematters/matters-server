import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['downvotes'] = (
  { id },
  _,
  { dataSources: { commentService } }
) => 0

export default resolver

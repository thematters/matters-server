import type { GQLCommentResolvers } from '#definitions/index.js'

const resolver: GQLCommentResolvers['downvotes'] = (
  { id },
  _,
  { dataSources: { commentService } }
) => 0

export default resolver

import type { GQLCommentResolvers } from 'definitions/index.js'

const resolver: GQLCommentResolvers['upvotes'] = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countUpVote(id)

export default resolver

import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['upvotes'] = (
  { id },
  _,
  { dataSources: { commentService } }
) => commentService.countUpVote(id)

export default resolver

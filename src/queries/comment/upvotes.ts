import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['upvotes'] = (
  { id, upvotes },
  _,
  { dataSources: { commentService } }
) => parseInt(upvotes, 10) || commentService.countUpVote(id)

export default resolver

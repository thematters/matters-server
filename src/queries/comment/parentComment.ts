import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['parentComment'] = (
  { parentCommentId },
  _,
  { dataSources: { commentService } }
) => (parentCommentId ? commentService.loadById(parentCommentId) : null)

export default resolver

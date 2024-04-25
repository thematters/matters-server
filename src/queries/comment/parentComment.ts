import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['parentComment'] = (
  { parentCommentId },
  _,
  { dataSources: { atomService } }
) =>
  parentCommentId ? atomService.commentIdLoader.load(parentCommentId) : null

export default resolver

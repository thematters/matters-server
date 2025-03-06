import type { GQLCommentResolvers } from 'definitions/index.js'

const resolver: GQLCommentResolvers['parentComment'] = (
  { parentCommentId },
  _,
  { dataSources: { atomService } }
) =>
  parentCommentId ? atomService.commentIdLoader.load(parentCommentId) : null

export default resolver

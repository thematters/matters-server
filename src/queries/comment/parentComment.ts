import type { GQLCommentResolvers } from 'definitions'

const resolver: GQLCommentResolvers['parentComment'] = (
  { parentCommentId },
  _,
  { dataSources: { commentService } }
) => (parentCommentId ? commentService.dataloader.load(parentCommentId) : null)

export default resolver

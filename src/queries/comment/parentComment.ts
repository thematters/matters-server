import { CommentToParentCommentResolver } from 'definitions'

const resolver: CommentToParentCommentResolver = (
  { parentCommentId },
  _,
  { dataSources: { commentService } }
) => (parentCommentId ? commentService.dataloader.load(parentCommentId) : null)

export default resolver

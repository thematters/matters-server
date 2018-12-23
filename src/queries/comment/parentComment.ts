import { Resolver } from 'definitions'

const resolver: Resolver = ({ parentCommentId }, _, { commentService }) =>
  parentCommentId ? commentService.dataloader.load(parentCommentId) : null

export default resolver

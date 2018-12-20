import { Resolver } from 'definitions'

const resolver: Resolver = ({ parentCommentId }, _, { commentService }) =>
  parentCommentId ? commentService.idLoader.load(parentCommentId) : null

export default resolver

import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ parentCommentId }, _, { commentService }) =>
  parentCommentId ? commentService.loader.load(parentCommentId) : null

export default resolver

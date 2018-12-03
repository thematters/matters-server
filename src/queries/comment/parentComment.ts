import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ parentCommentUUID }, _, { commentService }) =>
  parentCommentUUID ? commentService.loader.load(parentCommentUUID) : null

export default resolver

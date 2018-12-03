import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ pinnedCommentUUIDs }, _, { commentService }) =>
  commentService.loader.loadMany(pinnedCommentUUIDs)

export default resolver

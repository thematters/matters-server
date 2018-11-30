import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ pinnedCommentIds }, _, { commentService }) =>
  commentService.loader.loadMany(pinnedCommentIds)

export default resolver

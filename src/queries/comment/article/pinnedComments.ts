import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.findPinnedByArticle(id)

export default resolver

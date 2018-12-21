import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.countByArticle(id)

export default resolver

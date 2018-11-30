import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.countByArticle(id)

export default resolver

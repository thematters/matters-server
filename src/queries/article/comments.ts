import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.findByArticle(id)

export default resolver

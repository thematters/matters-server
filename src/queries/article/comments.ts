import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { commentService }) =>
  commentService.findByArticle(uuid)

export default resolver

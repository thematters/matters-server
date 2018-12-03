import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { commentService }) =>
  commentService.countByArticle(uuid)

export default resolver

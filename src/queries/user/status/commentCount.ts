import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { commentService }) =>
  commentService.countByAuthor(uuid)

export default resolver

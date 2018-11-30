import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.countByAuthor(id)

export default resolver

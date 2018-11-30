import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.findByAuthor(id)

export default resolver

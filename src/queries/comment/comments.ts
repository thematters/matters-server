import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.findByParent(id)

export default resolver

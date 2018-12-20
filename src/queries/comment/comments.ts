import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.findByParent(id)

export default resolver

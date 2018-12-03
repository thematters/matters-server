import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ uuid }, _, { commentService }) =>
  commentService.findByParent(uuid)

export default resolver

import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { commentService } }) =>
  commentService.findByParent(id)

export default resolver

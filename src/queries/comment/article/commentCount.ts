import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { commentService } }) =>
  commentService.countByArticle(id)

export default resolver

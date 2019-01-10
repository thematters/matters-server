import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { commentService } }) =>
  commentService.pinLeftByArticle(id)

export default resolver

import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { commentService } }) =>
  commentService.findPinnedByArticle(id)

export default resolver

import { Resolver } from 'definitions'

const resolver: Resolver = ({ hash }, _, { dataSources: { articleService } }) =>
  articleService.getContentFromHash(hash).slice(0, 30)

export default resolver

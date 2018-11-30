import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ downstreamIds }, _, { articleService }) =>
  articleService.loader.loadMany(downstreamIds)

export default resolver

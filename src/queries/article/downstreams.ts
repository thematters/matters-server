import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ downstreamUUIDs }, _, { articleService }) =>
  articleService.loader.loadMany(downstreamUUIDs)

export default resolver

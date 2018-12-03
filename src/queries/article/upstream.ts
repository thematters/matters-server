import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ upstreamUUID }, _, { articleService }) =>
  articleService.loader.load(upstreamUUID)

export default resolver

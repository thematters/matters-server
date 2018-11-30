import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ upstreamId }, _, { articleService }) =>
  articleService.loader.load(upstreamId)

export default resolver

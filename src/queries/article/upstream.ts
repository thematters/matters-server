import { Resolver } from 'definitions'

const resolver: Resolver = ({ upstreamId }, _, { articleService }) => {
  if (!upstreamId) {
    return null
  }

  return articleService.dataloader.load(upstreamId)
}

export default resolver

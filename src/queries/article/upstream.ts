import { Resolver } from 'definitions'

const resolver: Resolver = (
  { upstreamId },
  _,
  { dataSources: { articleService } }
) => {
  if (!upstreamId) {
    return null
  }

  return articleService.dataloader.load(upstreamId)
}

export default resolver

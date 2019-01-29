import { DraftToUpstreamResolver } from 'definitions'

const resolver: DraftToUpstreamResolver = async (
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

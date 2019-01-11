import { ArticleToUpstreamResolver } from 'definitions'

const resolver: ArticleToUpstreamResolver = (
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

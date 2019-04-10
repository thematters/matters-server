import { ArticleToCollectionResolver } from 'definitions'

const resolver: ArticleToCollectionResolver = (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  // if (!upstreamId) {
  //   return null
  // }

  // return articleService.dataloader.load(upstreamId)
  return []
}

export default resolver

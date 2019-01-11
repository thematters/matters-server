import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash } },
  { viewer, dataSources: { articleService } }
) => {
  if (!mediaHash) {
    return
  }
  return articleService.findByMediaHash(mediaHash)
}

export default resolver

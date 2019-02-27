import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash, uuid } },
  { viewer, dataSources: { articleService } }
) => {
  if (!mediaHash && !uuid) {
    return
  }

  if (mediaHash) {
    return articleService.findByMediaHash(mediaHash)
  }

  if (uuid) {
    return articleService.baseFindByUUID(uuid)
  }
}

export default resolver

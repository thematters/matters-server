import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash, uuid } },
  { viewer, dataSources: { articleService, userService } }
) => {
  if (!mediaHash && !uuid) {
    return
  }

  let article
  if (mediaHash) {
    article = await articleService.findByMediaHash(mediaHash)
  } else if (uuid) {
    article = await articleService.baseFindByUUID(uuid)
  }

  return article
}

export default resolver

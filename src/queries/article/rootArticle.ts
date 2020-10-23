import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash, uuid } },
  { viewer, dataSources: { articleService, draftService } }
) => {
  if (!mediaHash && !uuid) {
    return
  }

  // since draft is becoming content container, use node here
  // as variable name instead of article. The root naming
  // will be changed soon in the following refactoring.
  let node
  if (mediaHash) {
    node = await draftService.findByMediaHash(mediaHash)
  } else if (uuid) {
    const article = await articleService.baseFindByUUID(uuid)
    node = await draftService.baseFindById(article.draftId)
  }

  return node
}

export default resolver

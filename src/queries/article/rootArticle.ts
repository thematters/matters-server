import { QueryToArticleResolver } from 'definitions'

const resolver: QueryToArticleResolver = async (
  root,
  { input: { mediaHash } },
  { viewer, dataSources: { draftService } }
) => {
  if (!mediaHash) {
    return
  }

  // since draft is becoming content container, use node here
  // as variable name instead of article. The root naming
  // will be changed soon in the following refactoring.
  const node = await draftService.findByMediaHash(mediaHash)

  return node
}

export default resolver

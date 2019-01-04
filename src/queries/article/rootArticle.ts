import { Resolver } from 'definitions'

const resolver: Resolver = async (
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

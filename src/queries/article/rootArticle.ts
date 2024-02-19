import type { GQLQueryResolvers } from 'definitions'

const resolver: GQLQueryResolvers['article'] = async (
  _,
  { input: { mediaHash } },
  { dataSources: { articleService, atomService } }
) => {
  const { articleId } = await articleService.findVersionByMediaHash(mediaHash)

  return atomService.articleIdLoader.load(articleId)
}

export default resolver

import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['mediaHash'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.mediaHash || ''
}

export default resolver

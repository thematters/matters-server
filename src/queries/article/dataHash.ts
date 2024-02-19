import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['dataHash'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.dataHash || ''
}

export default resolver

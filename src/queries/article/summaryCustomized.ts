import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['summaryCustomized'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.summaryCustomized
}

export default resolver

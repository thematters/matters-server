import type { GQLArticleResolvers } from '#definitions/index.js'

const resolver: GQLArticleResolvers['indentFirstLine'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.indentFirstLine
}

export default resolver

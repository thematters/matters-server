import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['canComment'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.canComment
}

export default resolver

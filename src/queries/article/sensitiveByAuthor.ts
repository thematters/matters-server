import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['sensitiveByAuthor'] = async (
  { id },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(id)
  return articleVersion.sensitiveByAuthor
}

export default resolver

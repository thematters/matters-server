import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['revisedAt'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService } }
) => {
  const articleVersion = await articleService.loadLatestArticleVersion(
    articleId
  )

  return articleVersion.createdAt
}

export default resolver

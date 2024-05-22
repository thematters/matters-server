import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['revisedAt'] = async (
  { id: articleId },
  _,
  { dataSources: { articleService } }
) => {
  const count = await articleService.countArticleVersions(articleId)
  if (count === 1) {
    return null
  }
  const articleVersion = await articleService.loadLatestArticleVersion(
    articleId
  )

  return articleVersion.createdAt
}

export default resolver

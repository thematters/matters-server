import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['createdAt'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.createdAt
}

export default resolver

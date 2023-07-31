import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['pinned'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.pinned
}

export default resolver

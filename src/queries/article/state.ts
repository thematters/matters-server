import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['state'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.state
}

export default resolver

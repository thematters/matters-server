import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['remark'] = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.remark
}

export default resolver

import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['cover'] = async (
  { articleId },
  _,
  { dataSources: { articleService, systemService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article?.cover ? systemService.findAssetUrl(article.cover) : null
}

export default resolver

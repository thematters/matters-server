import { ArticleToRevisionCountResolver } from 'definitions'

const resolver: ArticleToRevisionCountResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.revisionCount || 0
}

export default resolver

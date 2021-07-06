import { ArticleToCreatedAtResolver } from 'definitions'

const resolver: ArticleToCreatedAtResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.createdAt
}

export default resolver

import { ArticleToStateResolver } from 'definitions'

const resolver: ArticleToStateResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.state
}

export default resolver

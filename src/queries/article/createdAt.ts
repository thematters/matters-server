import { ArticleToLiveResolver } from 'definitions'

const resolver: ArticleToLiveResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.createdAt
}

export default resolver

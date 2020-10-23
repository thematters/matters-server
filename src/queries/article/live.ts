import { ArticleToLiveResolver } from 'definitions'

const resolver: ArticleToLiveResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.live
}

export default resolver

import { ArticleToStickyResolver } from 'definitions'

const resolver: ArticleToStickyResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.sticky
}

export default resolver

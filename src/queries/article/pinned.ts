import { ArticleToPinnedResolver } from 'definitions'

const resolver: ArticleToPinnedResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const article = await articleService.dataloader.load(articleId)
  return article.pinned
}

export default resolver

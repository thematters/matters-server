import { ArticleToPinnedResolver } from 'definitions'

const resolver: ArticleToPinnedResolver = async (
  { articleId, pinned },
  _,
  { dataSources: { articleService } }
) => {
  // work around for pinned field, pinned below may be a cached value
  if (typeof pinned === 'boolean') {
    return pinned
  }
  const article = await articleService.dataloader.load(articleId)
  return article.pinned
}

export default resolver

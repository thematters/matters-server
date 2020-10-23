import { ArticleToSubscribedResolver } from 'definitions'

const resolver: ArticleToSubscribedResolver = (
  { articleId },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return false
  }

  return articleService.isSubscribed({
    userId: viewer.id,
    targetId: articleId,
  })
}

export default resolver

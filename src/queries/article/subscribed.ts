import { ArticleToSubscribedResolver } from 'definitions'

const resolver: ArticleToSubscribedResolver = (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return false
  }

  return articleService.isSubscribed({
    userId: viewer.id,
    targetId: id,
  })
}

export default resolver

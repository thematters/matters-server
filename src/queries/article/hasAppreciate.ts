import { ArticleToHasAppreciateResolver } from 'definitions'

const resolver: ArticleToHasAppreciateResolver = (
  { articleId },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return false
  }

  return articleService.hasAppreciate({
    userId: viewer.id,
    articleId,
  })
}

export default resolver

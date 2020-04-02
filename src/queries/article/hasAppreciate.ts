import { ArticleToHasAppreciateResolver } from 'definitions'

const resolver: ArticleToHasAppreciateResolver = (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return false
  }

  return articleService.hasAppreciate({
    userId: viewer.id,
    articleId: id,
  })
}

export default resolver

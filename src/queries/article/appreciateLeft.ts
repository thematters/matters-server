import { ArticleToAppreciateLeftResolver } from 'definitions'

const resolver: ArticleToAppreciateLeftResolver = async (
  { articleId },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return 0
  }

  return articleService.appreciateLeftByUser({
    articleId,
    userId: viewer.id,
  })
}

export default resolver

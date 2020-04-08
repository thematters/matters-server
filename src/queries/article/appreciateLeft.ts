import { ArticleToAppreciateLeftResolver } from 'definitions'

const resolver: ArticleToAppreciateLeftResolver = async (
  { id },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    return 0
  }

  return articleService.appreciateLeftByUser({
    articleId: id,
    userId: viewer.id,
  })
}

export default resolver

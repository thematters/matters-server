import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['appreciateLeft'] = async (
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

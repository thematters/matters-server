import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['appreciateLeft'] = async (
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

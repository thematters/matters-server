import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['donated'] = async (
  { id: articleId },
  _,
  { viewer, dataSources: { paymentService } }
) => {
  if (!viewer.id) {
    return false
  }
  return paymentService.isDonator(viewer.id, articleId)
}

export default resolver

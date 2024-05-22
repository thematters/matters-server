import type { GQLArticleResolvers } from 'definitions'

const resolver: GQLArticleResolvers['replyToDonator'] = async (
  { authorId, id: articleId },
  _,
  { viewer, dataSources: { articleService, paymentService } }
) => {
  if (!viewer.id) {
    return null
  }

  const getReplyToDonator = async () => {
    const { replyToDonator } = await articleService.loadLatestArticleVersion(
      articleId
    )
    return replyToDonator
  }

  const isAuthor = viewer.id === authorId

  return isAuthor || (await paymentService.isDonator(viewer.id, articleId))
    ? await getReplyToDonator()
    : null
}

export default resolver

import { ARTICLE_STATE } from 'common/enums'
import { correctHtml, isArticleLimitedFree } from 'common/utils'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { articleId, authorId, content },
  _,
  { viewer, dataSources: { articleService, atomService, paymentService } }
) => {
  const article = await articleService.dataloader.load(articleId)

  const isActive = article.state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  if (isAdmin || isAuthor) {
    return correctHtml(content)
  }

  // inactive
  if (!isActive) {
    return ''
  }

  // active
  const articleCircle = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId },
  })

  // not in circle
  if (!articleCircle) {
    return correctHtml(content)
  }

  if (!viewer.id) {
    return ''
  }

  // not under the free period or not circle member
  if (!isArticleLimitedFree(articleCircle.createdAt)) {
    const isCircleMember = await paymentService.isCircleMember({
      userId: viewer.id,
      circleId: articleCircle.circleId,
    })

    if (!isCircleMember) {
      return ''
    }
  }

  return correctHtml(content)
}

export default resolver

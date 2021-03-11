import { ARTICLE_STATE, CIRCLE_STATE } from 'common/enums'
import { correctHtml, isArticleLimitedFree } from 'common/utils'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { articleId, authorId, content },
  _,
  { viewer, dataSources: { articleService, atomService, paymentService }, knex }
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
  const articleCircle = await knex
    .select('article_circle.*')
    .from('article_circle')
    .join('circle', 'article_circle.circle_id', 'circle.id')
    .where({
      'article_circle.article_id': articleId,
      'circle.state': CIRCLE_STATE.active,
    })
    .first()

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

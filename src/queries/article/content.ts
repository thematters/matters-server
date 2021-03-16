import { ARTICLE_STATE, CIRCLE_STATE } from 'common/enums'
import { correctHtml, isArticleLimitedFree } from 'common/utils'
import { ArticleToContentResolver } from 'definitions'

// ACL for article content
const resolver: ArticleToContentResolver = async (
  { articleId, authorId, content },
  _,
  { viewer, dataSources: { articleService, paymentService }, knex }
) => {
  const article = await articleService.dataloader.load(articleId)

  const isActive = article.state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  // check viewer
  if (isAdmin || isAuthor) {
    return correctHtml(content)
  }

  // check article state
  if (!isActive) {
    return ''
  }

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

  // limited free
  const isLimitedFree = isArticleLimitedFree(articleCircle.createdAt)
  if (isLimitedFree) {
    return correctHtml(content)
  }

  if (!viewer.id) {
    return ''
  }

  const isCircleMember = await paymentService.isCircleMember({
    userId: viewer.id,
    circleId: articleCircle.circleId,
  })

  // not circle member
  if (!isCircleMember) {
    return ''
  }

  return correctHtml(content)
}

export default resolver

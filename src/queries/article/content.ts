import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE, CIRCLE_STATE } from 'common/enums'
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

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public
  const isPaywalled = articleCircle.access === ARTICLE_ACCESS_TYPE.paywall

  // public
  if (isPublic) {
    return correctHtml(content)
  }

  // limited free
  if (isPaywalled && isArticleLimitedFree(articleCircle.createdAt)) {
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

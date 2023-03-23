import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE } from 'common/enums/index.js'
import { correctHtml } from 'common/utils/index.js'
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

  const articleCircle = await articleService.findArticleCircle(articleId)

  // not in circle
  if (!articleCircle) {
    return correctHtml(content)
  }

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

  // public
  if (isPublic) {
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

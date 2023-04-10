import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE } from 'common/enums'
import { ArticleContentsToMarkdownResolver } from 'definitions'

export const markdown: ArticleContentsToMarkdownResolver = async (
  { articleId, authorId, contentMd },
  _,
  { viewer, dataSources: { articleService, paymentService }, knex }
) => {
  const article = await articleService.dataloader.load(articleId)

  const isActive = article.state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  // check viewer
  if (isAdmin || isAuthor) {
    return contentMd
  }

  // check article state
  if (!isActive) {
    return ''
  }

  const articleCircle = await articleService.findArticleCircle(articleId)

  // not in circle
  if (!articleCircle) {
    return contentMd
  }

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

  // public
  if (isPublic) {
    return contentMd
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

  return contentMd
}

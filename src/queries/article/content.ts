import type { GQLArticleResolvers } from 'definitions'

import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE } from 'common/enums'

// ACL for article content
const resolver: GQLArticleResolvers['content'] = async (
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
    return content
  }

  // check article state
  if (!isActive) {
    return ''
  }

  const articleCircle = await articleService.findArticleCircle(articleId)

  // not in circle
  if (!articleCircle) {
    return content
  }

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

  // public
  if (isPublic) {
    return content
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

  return content
}

export default resolver

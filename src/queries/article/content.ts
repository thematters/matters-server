import type { GQLArticleResolvers } from 'definitions'

import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE } from 'common/enums'

// ACL for article content
const resolver: GQLArticleResolvers['content'] = async (
  { id, authorId, state },
  _,
  { viewer, dataSources: { articleService, paymentService } }
) => {
  const isActive = state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  // check viewer
  if (isAdmin || isAuthor) {
    return articleService.loadLatestArticleContent(id)
  }

  // check article state
  if (!isActive) {
    return ''
  }

  const articleCircle = await articleService.findArticleCircle(id)

  // not in circle
  if (!articleCircle) {
    return articleService.loadLatestArticleContent(id)
  }

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

  // public
  if (isPublic) {
    return articleService.loadLatestArticleContent(id)
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

  return articleService.loadLatestArticleContent(id)
}

export default resolver

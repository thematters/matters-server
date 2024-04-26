import type { GQLArticleContentsResolvers } from 'definitions'

import { ARTICLE_ACCESS_TYPE, ARTICLE_STATE } from 'common/enums'

export const html: GQLArticleContentsResolvers['html'] = async (
  { articleId, contentId },
  _,
  { viewer, dataSources: { articleService, paymentService, atomService } }
) => {
  const { authorId, state } = await atomService.articleIdLoader.load(articleId)
  const isActive = state === ARTICLE_STATE.active
  const isAdmin = viewer.hasRole('admin')
  const isAuthor = authorId === viewer.id

  // check viewer
  if (isAdmin || isAuthor) {
    return (await atomService.articleContentIdLoader.load(contentId)).content
  }

  // check article state
  if (!isActive) {
    return ''
  }

  const articleCircle = await articleService.findArticleCircle(articleId)

  // not in circle
  if (!articleCircle) {
    return (await atomService.articleContentIdLoader.load(contentId)).content
  }

  const isPublic = articleCircle.access === ARTICLE_ACCESS_TYPE.public

  // public
  if (isPublic) {
    return (await atomService.articleContentIdLoader.load(contentId)).content
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

  return (await atomService.articleContentIdLoader.load(contentId)).content
}

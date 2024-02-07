import type { GQLArticleAccessResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'

export const secret: GQLArticleAccessResolvers['secret'] = async (
  { id, authorId },
  _,
  { viewer, dataSources: { articleService } }
) => {
  if (!authorId || !viewer.id) {
    return
  }

  // check viewer is owner
  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const articleCircle = await articleService.findArticleCircle(id)

  if (!articleCircle) {
    return
  }

  return articleCircle.secret
}

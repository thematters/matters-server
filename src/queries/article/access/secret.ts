import { ForbiddenError } from 'common/errors.js'
import { ArticleAccessToSecretResolver } from 'definitions'

export const secret: ArticleAccessToSecretResolver = async (
  { articleId, authorId },
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

  const articleCircle = await articleService.findArticleCircle(articleId)

  if (!articleCircle) {
    return
  }

  return articleCircle.secret
}

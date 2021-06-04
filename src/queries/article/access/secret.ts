import { CIRCLE_STATE } from 'common/enums'
import { ForbiddenError } from 'common/errors'
import { ArticleAccessToSecretResolver } from 'definitions'

export const secret: ArticleAccessToSecretResolver = async (
  { articleId, authorId },
  _,
  { viewer, knex }
) => {
  if (!authorId || !viewer.id) {
    return
  }

  // check viewer is owner
  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const articleCircle = await knex
    .select('article_circle.*')
    .from('article_circle')
    .join('circle', 'article_circle.circle_id', 'circle.id')
    .where({
      'article_circle.article_id': articleId,
      'circle.state': CIRCLE_STATE.active,
      'circle.owner': viewer.id,
    })
    .first()

  if (!articleCircle) {
    return
  }

  return articleCircle.secret
}

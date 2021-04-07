import { CIRCLE_STATE } from 'common/enums'
import { ArticleAccessToSecretResolver } from 'definitions'

export const secret: ArticleAccessToSecretResolver = async (
  { articleId },
  _,
  { knex }
) => {
  const articleCircle = await knex
    .select('article_circle.*')
    .from('article_circle')
    .join('circle', 'article_circle.circle_id', 'circle.id')
    .where({
      'article_circle.article_id': articleId,
      'circle.state': CIRCLE_STATE.active,
    })
    .first()

  if (!articleCircle) {
    return
  }

  return articleCircle.secret
}

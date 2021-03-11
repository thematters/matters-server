import { CIRCLE_STATE } from 'common/enums'
import { isArticleLimitedFree } from 'common/utils'
import { ArticleToLimitedFreeResolver } from 'definitions'

const resolver: ArticleToLimitedFreeResolver = async (
  { articleId },
  _,
  { dataSources: {}, knex }
) => {
  const articleCircle = await knex
    .select('article_circle.created_at')
    .from('article_circle')
    .join('circle', 'article_circle.circle_id', 'circle.id')
    .where({
      'article_circle.article_id': articleId,
      'circle.state': CIRCLE_STATE.active,
    })
    .first()

  // not in circle
  if (!articleCircle) {
    return false
  }

  return isArticleLimitedFree(articleCircle.createdAt)
}

export default resolver

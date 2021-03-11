import { CIRCLE_STATE } from 'common/enums'
import { ArticleToCircleResolver } from 'definitions'

const resolver: ArticleToCircleResolver = async (
  { articleId },
  _,
  { dataSources: { atomService }, knex }
) => {
  if (!articleId) {
    return
  }

  const articleCircle = await knex
    .select('article_circle.*')
    .from('article_circle')
    .join('circle', 'article_circle.circle_id', 'circle.id')
    .where({
      'article_circle.article_id': articleId,
      'circle.state': CIRCLE_STATE.active,
    })
    .first()

  if (!articleCircle || !articleCircle.circleId) {
    return
  }

  const circle = await atomService.circleIdLoader.load(articleCircle.circleId)

  return circle
}

export default resolver

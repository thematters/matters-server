import { ARTICLE_ACCESS_TYPE, CIRCLE_STATE } from 'common/enums'
import { isArticleLimitedFree } from 'common/utils'
import { ArticleAccessToTypeResolver } from 'definitions'

export const type: ArticleAccessToTypeResolver = async (
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

  // not in circle, fallback to public
  if (!articleCircle) {
    return ARTICLE_ACCESS_TYPE.public
  }

  // public
  if (articleCircle.access === ARTICLE_ACCESS_TYPE.public) {
    return ARTICLE_ACCESS_TYPE.public
  }

  // limitedFree
  if (
    articleCircle.access === ARTICLE_ACCESS_TYPE.paywall &&
    isArticleLimitedFree(articleCircle.createdAt)
  ) {
    return ARTICLE_ACCESS_TYPE.limitedFree
  }

  // paywall
  return ARTICLE_ACCESS_TYPE.paywall
}

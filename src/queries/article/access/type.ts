import { ARTICLE_ACCESS_TYPE } from 'common/enums'
import { ArticleAccessToTypeResolver } from 'definitions'

export const type: ArticleAccessToTypeResolver = async (
  { articleId },
  _,
  { dataSources: { articleService } }
) => {
  const articleCircle = await articleService.findArticleCircle(articleId)

  // not in circle, fallback to public
  if (!articleCircle) {
    return ARTICLE_ACCESS_TYPE.public
  }

  // public
  if (articleCircle.access === ARTICLE_ACCESS_TYPE.public) {
    return ARTICLE_ACCESS_TYPE.public
  }

  // paywall
  return ARTICLE_ACCESS_TYPE.paywall
}

import { ArticleAccessToCircleResolver } from 'definitions'

export const circle: ArticleAccessToCircleResolver = async (
  { articleId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const articleCircle = await articleService.findArticleCircle(articleId)

  if (!articleCircle || !articleCircle.circleId) {
    return
  }

  return atomService.circleIdLoader.load(articleCircle.circleId)
}

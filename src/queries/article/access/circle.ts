import type { GQLArticleAccessResolvers, Circle } from 'definitions'

export const circle: GQLArticleAccessResolvers['circle'] = async (
  { articleId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const articleCircle = await articleService.findArticleCircle(articleId)

  if (!articleCircle || !articleCircle.circleId) {
    return null
  }

  return atomService.circleIdLoader.load(
    articleCircle.circleId
  ) as Promise<Circle>
}

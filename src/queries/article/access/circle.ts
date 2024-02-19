import type { GQLArticleAccessResolvers, Circle } from 'definitions'

export const circle: GQLArticleAccessResolvers['circle'] = async (
  { id },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const articleCircle = await articleService.findArticleCircle(id)

  if (!articleCircle || !articleCircle.circleId) {
    return null
  }

  return atomService.circleIdLoader.load(
    articleCircle.circleId
  ) as Promise<Circle>
}

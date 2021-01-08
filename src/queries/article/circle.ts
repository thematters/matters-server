import { ArticleToCircleResolver } from 'definitions'

const resolver: ArticleToCircleResolver = async (
  { articleId },
  _,
  { dataSources: { atomService } }
) => {
  if (!articleId) {
    return
  }

  const articleCircle = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId },
  })

  if (!articleCircle || !articleCircle.circleId) {
    return
  }

  const circle = await atomService.circleIdLoader.load(articleCircle.circleId)

  return circle
}

export default resolver

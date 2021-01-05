import { ArticleToCircleResolver } from 'definitions'

const resolver: ArticleToCircleResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return []
  }

  const circleId = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId: id },
  })
  const circle = await atomService.circleIdLoader.load(circleId)
  return circle
}

export default resolver

import { ArticleToCircleResolver } from 'definitions'

const resolver: ArticleToCircleResolver = async (
  { id },
  _,
  { dataSources: { atomService } }
) => {
  if (!id) {
    return []
  }

  const circleIds = await atomService.findMany({
    table: 'article_circle',
    where: { articleId: id },
  })
  const circles = await atomService.circleIdLoader.loadMany(
    circleIds.map(({ circleId }) => circleId)
  )
  return circles
}

export default resolver

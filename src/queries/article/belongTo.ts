import { ArticleToBelongToResolver } from 'definitions'

const resolver: ArticleToBelongToResolver = async (
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

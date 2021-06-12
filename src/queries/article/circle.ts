import { ArticleToCircleResolver } from 'definitions'

const resolver: ArticleToCircleResolver = async (
  { articleId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  if (!articleId) {
    return
  }

  const articleCircle = await articleService.findArticleCircle(articleId)

  if (!articleCircle || !articleCircle.circleId) {
    return
  }

  const circle = await atomService.circleIdLoader.load(articleCircle.circleId)

  return circle
}

export default resolver

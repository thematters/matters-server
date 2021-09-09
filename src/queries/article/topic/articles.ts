import { TopicToArticlesResolver } from 'definitions'

const resolver: TopicToArticlesResolver = async (
  { id: topicId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const topicArticles = await atomService.findMany({
    table: 'article_topic',
    where: { topicId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })

  return articleService.draftLoader.loadMany(
    topicArticles.map((item) => item.articleId)
  )
}

export default resolver

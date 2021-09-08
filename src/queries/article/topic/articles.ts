import { TopicToArticlesResolver } from 'definitions'

const resolver: TopicToArticlesResolver = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.findMany({
    table: 'article_topic',
    where: { topicId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })
}

export default resolver

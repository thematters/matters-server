import { TopicToArticleCountResolver } from 'definitions'

const resolver: TopicToArticleCountResolver = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.count({
    table: 'article_topic',
    where: { topicId },
  })
}

export default resolver

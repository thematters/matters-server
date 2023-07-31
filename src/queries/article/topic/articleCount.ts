import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['articleCount'] = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'article_topic',
    where: { topicId },
  })

export default resolver

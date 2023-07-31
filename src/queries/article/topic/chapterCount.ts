import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['chapters'] = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'chapter',
    where: { topicId },
  })

export default resolver

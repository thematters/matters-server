import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['chapters'] = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.findMany({
    table: 'chapter',
    where: { topicId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })

export default resolver

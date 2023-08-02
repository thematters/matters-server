import type { GQLTopicResolvers } from 'definitions'

const resolver: GQLTopicResolvers['chapterCount'] = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'chapter',
    where: { topicId },
  })

export default resolver

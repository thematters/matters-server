import { TopicToChaptersResolver } from 'definitions'

const resolver: TopicToChaptersResolver = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.findMany({
    table: 'chapter',
    where: { topicId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })
}

export default resolver

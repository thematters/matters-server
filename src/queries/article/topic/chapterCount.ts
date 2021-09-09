import { TopicToChaptersResolver } from 'definitions'

const resolver: TopicToChaptersResolver = async (
  { id: topicId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.count({
    table: 'chapter',
    where: { topicId },
  })
}

export default resolver

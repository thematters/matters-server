import { ChapterToTopicResolver } from 'definitions'

const resolver: ChapterToTopicResolver = async (
  { id: chapterId },
  _,
  { dataSources: { atomService } }
) => {
  const chapter = await atomService.findFirst({
    table: 'chapter',
    where: { id: chapterId },
  })

  return atomService.findFirst({
    table: 'topic',
    where: { id: chapter.topicId },
  })
}

export default resolver

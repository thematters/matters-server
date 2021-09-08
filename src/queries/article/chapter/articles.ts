import { ChapterToArticlesResolver } from 'definitions'

const resolver: ChapterToArticlesResolver = async (
  { id: chapterId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.findMany({
    table: 'article_chapter',
    where: { chapterId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })
}

export default resolver

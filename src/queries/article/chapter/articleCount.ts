import { ChapterToArticleCountResolver } from 'definitions'

const resolver: ChapterToArticleCountResolver = async (
  { id: chapterId },
  _,
  { dataSources: { atomService } }
) => {
  return atomService.count({
    table: 'article_chapter',
    where: { chapterId },
  })
}

export default resolver

import type { GQLChapterResolvers } from 'definitions'

const resolver: GQLChapterResolvers['articles'] = async (
  { id: chapterId },
  _,
  { dataSources: { atomService, draftService } }
) => {
  const chapterArticles = await atomService.findMany({
    table: 'article_chapter',
    where: { chapterId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })

  return draftService.loadByIds(chapterArticles.map((item) => item.articleId))
}

export default resolver

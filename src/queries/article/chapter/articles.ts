import { ChapterToArticlesResolver } from 'definitions'

const resolver: ChapterToArticlesResolver = async (
  { id: chapterId },
  _,
  { dataSources: { atomService, articleService } }
) => {
  const chapterArticles = await atomService.findMany({
    table: 'article_chapter',
    where: { chapterId },
    orderBy: [{ column: 'order', order: 'asc' }],
  })

  return articleService.draftLoader.loadMany(
    chapterArticles.map((item) => item.articleId)
  )
}

export default resolver

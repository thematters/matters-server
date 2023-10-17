import type { GQLChapterResolvers } from 'definitions'

const resolver: GQLChapterResolvers['articleCount'] = async (
  { id: chapterId },
  _,
  { dataSources: { atomService } }
) =>
  atomService.count({
    table: 'article_chapter',
    where: { chapterId },
  })

export default resolver

import type { GQLUserResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'

const resolver: GQLUserResolvers['latestWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, collectionService, draftService } }
) => {
  const [articles, collections] = await Promise.all([
    articleService.findByAuthor(id, {
      take: 3,
      columns: ['draft_id', 'created_at'],
    }),
    collectionService.findByAuthor(id, { take: 3 }),
  ])
  const pinnedWorks = [
    ...articles.map((article: { draftId: string; createdAt: Date }) => ({
      ...article,
      __type: NODE_TYPES.Article,
    })),
    ...collections.map((collection) => ({
      ...collection,
      __type: NODE_TYPES.Collection,
    })),
  ]
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 3)

  return await Promise.all(
    pinnedWorks.map(async (work) => {
      if (work.__type === NODE_TYPES.Article) {
        const draft = await draftService.loadById(work.draftId)
        return { ...draft, __type: NODE_TYPES.Article }
      } else {
        return work
      }
    })
  )
}

export default resolver

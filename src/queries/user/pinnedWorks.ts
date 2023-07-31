import type { GQLUserResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'

const resolver: GQLUserResolvers['pinnedWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, collectionService, draftService } }
) => {
  const [articles, collections] = await Promise.all([
    articleService.findPinnedByAuthor(id),
    collectionService.findPinnedByAuthor(id),
  ])
  const pinnedWorks = [
    ...articles.map((article) => ({ ...article, __type: NODE_TYPES.Article })),
    ...collections.map((collection) => ({
      ...collection,
      __type: NODE_TYPES.Collection,
    })),
  ].sort((a, b) => a.pinnedAt.getTime() - b.pinnedAt.getTime())

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

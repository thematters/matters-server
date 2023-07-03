import type { UserToPinnedWorksResolver } from 'definitions'

import { NODE_TYPES } from 'common/enums'

const resolver: UserToPinnedWorksResolver = async (
  { id },
  _,
  { dataSources: { articleService, collectionService, draftService } }
) => {
  const articles = (await articleService.findPinnedByAuthor(id)).map(
    (article) => ({ ...article, __type: NODE_TYPES.Article })
  )
  const collections = (await collectionService.findPinnedByAuthor(id)).map(
    (collection) => ({ ...collection, __type: NODE_TYPES.Collection })
  )
  const pinnedWorks = [...articles, ...collections].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )
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

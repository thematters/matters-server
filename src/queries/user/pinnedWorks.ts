import type { GQLUserResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'

const resolver: GQLUserResolvers['pinnedWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, collectionService } }
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

  return pinnedWorks
}

export default resolver

import type { GQLUserResolvers } from 'definitions'

import { NODE_TYPES, LATEST_WORKS_NUM } from 'common/enums'

const resolver: GQLUserResolvers['latestWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, collectionService } }
) => {
  const [articles, collections] = await Promise.all([
    articleService.findByAuthor(id, {
      take: LATEST_WORKS_NUM,
    }),
    collectionService.findByAuthor(id, { take: LATEST_WORKS_NUM }, true),
  ])
  const works = [
    ...articles.map((article) => ({
      ...article,
      __type: NODE_TYPES.Article,
    })),
    ...collections.map((collection) => ({
      ...collection,
      __type: NODE_TYPES.Collection,
    })),
  ]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, LATEST_WORKS_NUM)

  return works
}

export default resolver

import type { GQLUserResolvers } from 'definitions'

import { NODE_TYPES } from 'common/enums'

const resolver: GQLUserResolvers['latestWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, collectionService } }
) => {
  const [articles, collections] = await Promise.all([
    articleService.findByAuthor(id, {
      take: 3,
    }),
    collectionService.findByAuthor(id, { take: 3 }),
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
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .slice(0, 3)

  return works
}

export default resolver

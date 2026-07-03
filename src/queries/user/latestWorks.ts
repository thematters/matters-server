import type { GQLUserResolvers } from '#definitions/index.js'

import {
  NODE_TYPES,
  LATEST_WORKS_NUM,
  USER_STATE,
} from '#common/enums/index.js'

const restrictedAuthorStates = new Set<string>([
  USER_STATE.frozen,
  USER_STATE.banned,
  USER_STATE.archived,
])

const resolver: GQLUserResolvers['latestWorks'] = async (
  { id },
  _,
  { dataSources: { articleService, atomService, collectionService }, viewer }
) => {
  const user = await atomService.userIdLoader.load(id)
  const hideArticles =
    viewer.id !== id &&
    !viewer.hasRole('admin') &&
    user &&
    restrictedAuthorStates.has(user.state)

  const [articles, collections] = await Promise.all([
    hideArticles
      ? []
      : articleService.findByAuthor(id, {
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

import type { GQLUserResolvers } from 'definitions'

import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'

const resolver: GQLUserResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { articleService, draftService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  const articles = await articleService.findByAuthor(id, {
    // filter,
    showAll: isViewer || isAdmin,
    orderBy: [{ column: 'article.id', order: 'desc' }],
  })

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map((article: any) => article.draftId)),
    input
  )
}

export default resolver

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
  const state = input?.filter?.state ?? (isViewer || isAdmin) ? null : 'active'

  const articles = await articleService.findByAuthor(id, {
    state,
    orderBy: input.sort,
  })

  return connectionFromPromisedArray(
    draftService.loadByIds(articles.map((article: any) => article.draftId)),
    input
  )
}

export default resolver

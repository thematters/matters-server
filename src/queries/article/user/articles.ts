import type { GQLUserResolvers } from 'definitions'

import { getLogger } from 'common/logger'
import { connectionFromArray, connectionFromPromisedArray } from 'common/utils'

const logger = getLogger('resolver-user-articles')

const resolver: GQLUserResolvers['articles'] = async (
  { id },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')
  // only viewer and admin can see all articles
  let state
  if (isViewer || isAdmin) {
    state = input?.filter?.state ?? null
  } else {
    state = input?.filter?.state ?? 'active'
    if (state !== 'active') {
      logger.warn('user %s is not allowed to see state %s', viewer.id, state)
      return connectionFromArray([], input)
    }
  }

  const articles = await articleService.findByAuthor(id, {
    state,
    orderBy: input.sort,
  })

  return connectionFromPromisedArray(articles, input)
}

export default resolver

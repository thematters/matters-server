import type { GQLUserResolvers } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
} from '#common/utils/index.js'

const logger = getLogger('resolver-user-articles')

const resolver: GQLUserResolvers['articles'] = async (
  { id, state: userState },
  { input },
  { dataSources: { articleService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  if (!isViewer && !isAdmin && userState === USER_STATE.frozen) {
    return connectionFromArray([], input)
  }

  // only viewer and admin can see all articles
  let articleState
  if (isViewer || isAdmin) {
    articleState = input?.filter?.state ?? null
  } else {
    articleState = input?.filter?.state ?? 'active'
    if (articleState !== 'active') {
      logger.warn(
        'user %s is not allowed to see state %s',
        viewer.id,
        articleState
      )
      return connectionFromArray([], input)
    }
  }

  const articles = await articleService.findByAuthor(id, {
    state: articleState,
    orderBy: input.sort,
  })

  return connectionFromPromisedArray(articles, input)
}

export default resolver

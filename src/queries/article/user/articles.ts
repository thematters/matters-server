import type { GQLUserResolvers } from '#definitions/index.js'

import { USER_STATE } from '#common/enums/index.js'
import { getLogger } from '#common/logger.js'
import {
  connectionFromArray,
  connectionFromPromisedArray,
} from '#common/utils/index.js'

const logger = getLogger('resolver-user-articles')

const restrictedAuthorStates = new Set<string>([
  USER_STATE.frozen,
  USER_STATE.banned,
  USER_STATE.archived,
])

const resolver: GQLUserResolvers['articles'] = async (
  { id, state: userState },
  { input },
  { dataSources: { articleService, atomService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const isViewer = viewer.id === id
  const isAdmin = viewer.hasRole('admin')

  if (!isViewer && !isAdmin) {
    const authorState =
      userState ?? (await atomService.userIdLoader.load(id))?.state ?? null
    if (authorState && restrictedAuthorStates.has(authorState)) {
      return connectionFromArray([], input)
    }
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

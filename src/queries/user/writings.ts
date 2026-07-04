import type { GQLUserResolvers } from '#definitions/index.js'

import { NODE_TYPES, USER_STATE } from '#common/enums/index.js'
import {
  connectionFromArray,
  connectionFromUnionQuery,
} from '#common/utils/index.js'

const restrictedAuthorStates = new Set<string>([
  USER_STATE.frozen,
  USER_STATE.banned,
  USER_STATE.archived,
])

const resolver: GQLUserResolvers['writings'] = async (
  { id, state },
  { input },
  { dataSources: { userWorkService, atomService }, viewer }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  if (viewer.id !== id && !viewer.hasRole('admin')) {
    const authorState =
      state ?? (await atomService.userIdLoader.load(id))?.state ?? null
    if (authorState && restrictedAuthorStates.has(authorState)) {
      return connectionFromArray([], input)
    }
  }

  return connectionFromUnionQuery({
    query: userWorkService.findWritingsByUser(id),
    args: input,
    orderBy: { column: 'created_at', order: 'desc' },
    cursorColumn: 'id',
    dataloaders: {
      [NODE_TYPES.Moment]: atomService.momentIdLoader,
      [NODE_TYPES.Article]: atomService.articleIdLoader,
    },
  })
}

export default resolver

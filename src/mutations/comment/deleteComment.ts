import type { GQLMutationResolvers, Comment } from 'definitions'

import {
  CACHE_KEYWORD,
  COMMENT_STATE,
  COMMENT_TYPE,
  NODE_TYPES,
  USER_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['deleteComment'] = async (
  _,
  { input: { id } },
  { viewer, dataSources: { atomService, commentService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  // check target
  const node =
    comment.type === COMMENT_TYPE.article
      ? await atomService.articleIdLoader.load(comment.targetId)
      : await atomService.circleIdLoader.load(comment.targetId)

  // check permission
  if (comment.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  // archive comment
  const newComment = await commentService.baseUpdate(dbId, {
    state: COMMENT_STATE.archived,
  })

  // invalidate extra nodes
  ;(newComment as Comment & { [CACHE_KEYWORD]: any })[CACHE_KEYWORD] = [
    {
      id: node.id,
      type:
        comment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : NODE_TYPES.Circle,
    },
  ]

  return newComment
}
export default resolver

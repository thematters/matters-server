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
  CommentNotFoundError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['deleteComment'] = async (
  _,
  { input: { id } },
  { viewer, dataSources: { atomService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await atomService.commentIdLoader.load(dbId)

  if (!comment) {
    throw new CommentNotFoundError('comment not found')
  }

  // check permission
  const authorized = [
    comment.authorId,
    ...(comment.type === COMMENT_TYPE.moment
      ? [(await atomService.momentIdLoader.load(comment.targetId)).authorId]
      : []),
  ]
  if (!authorized.includes(viewer.id)) {
    throw new ForbiddenError('viewer has no permission')
  }

  // archive comment
  const newComment = await atomService.update({
    table: 'comment',
    where: { id: dbId },
    data: {
      state: COMMENT_STATE.archived,
    },
  })
  notificationService.withdraw(`put-comment:${dbId}`)

  // invalidate extra nodes
  ;(
    newComment as Comment & {
      [CACHE_KEYWORD]: [{ id: string; type: NODE_TYPES }]
    }
  )[CACHE_KEYWORD] = [
    {
      id: comment.targetId,
      type:
        comment.type === COMMENT_TYPE.article
          ? NODE_TYPES.Article
          : comment.type === COMMENT_TYPE.moment
          ? NODE_TYPES.Moment
          : NODE_TYPES.Circle,
    },
  ]

  return newComment
}

export default resolver

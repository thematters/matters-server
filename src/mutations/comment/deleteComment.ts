import type { GQLMutationResolvers } from 'definitions'

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
  { viewer, dataSources: { atomService, commentService, articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const comment = await commentService.loadById(dbId)

  // check target
  let article: any
  let circle: any
  if (comment.type === COMMENT_TYPE.article) {
    article = await articleService.dataloader.load(comment.targetId)
  } else {
    circle = await atomService.circleIdLoader.load(comment.targetId)
  }

  // check permission
  if (comment.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  // archive comment
  const newComment = await commentService.baseUpdate(dbId, {
    state: COMMENT_STATE.archived,
    updatedAt: new Date(),
  })

  // invalidate extra nodes
  newComment[CACHE_KEYWORD] = [
    {
      id: article ? article.id : circle.id,
      type: article ? NODE_TYPES.Article : NODE_TYPES.Circle,
    },
  ]

  return newComment
}
export default resolver

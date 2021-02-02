import {
  CACHE_KEYWORD,
  COMMENT_STATE,
  NODE_TYPES,
  USER_STATE,
} from 'common/enums'
import {
  AuthenticationError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteCommentResolver } from 'definitions'

const resolver: MutationToDeleteCommentResolver = async (
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
  const comment = await commentService.dataloader.load(dbId)

  // check target
  const [articleTypeId, circleTypeId] = (
    await atomService.findMany({
      table: 'entity_type',
      whereIn: ['table', ['article', 'circle']],
    })
  ).map((types) => types.id)
  const isTargetArticle = articleTypeId === comment.targetTypeId
  const isTargetCircle = circleTypeId === comment.targetTypeId

  let article: any
  let circle: any
  let targetAuthor: any
  if (isTargetArticle) {
    article = await articleService.dataloader.load(comment.targetId)
    targetAuthor = article.authorId
  } else if (isTargetCircle) {
    circle = await articleService.dataloader.load(comment.targetId)
    targetAuthor = circle.owner
  }

  // check permission
  const isTargetAuthor = targetAuthor === viewer.id
  if (!isTargetAuthor) {
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
      type: article ? NODE_TYPES.article : NODE_TYPES.circle,
    },
  ]

  return newComment
}
export default resolver

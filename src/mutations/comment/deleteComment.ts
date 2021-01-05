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
  {
    viewer,
    dataSources: { commentService, articleService, notificationService },
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const { authorId, articleId } = await commentService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const comment = await commentService.baseUpdate(dbId, {
    state: COMMENT_STATE.archived,
    updatedAt: new Date(),
  })

  // invalidate extra nodes
  // TODO: update for comment in circles
  const article = await articleService.dataloader.load(articleId)
  comment[CACHE_KEYWORD] = [
    {
      id: article.id,
      type: NODE_TYPES.article,
    },
  ]

  return comment
}
export default resolver

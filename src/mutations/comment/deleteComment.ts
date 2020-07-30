import { CACHE_KEYWORD, COMMENT_STATE, NODE_TYPES } from 'common/enums'
import { AuthenticationError, ForbiddenError } from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
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

  const { id: dbId } = fromGlobalId(id)
  const { authorId, articleId } = await commentService.dataloader.load(dbId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const comment = await commentService.baseUpdate(dbId, {
    state: COMMENT_STATE.archived,
    updatedAt: new Date(),
  })

  // publish a PubSub event
  const article = await articleService.dataloader.load(articleId)
  // notificationService.pubsub.publish(
  //   toGlobalId({
  //     type: 'Article',
  //     id: article.id,
  //   }),
  //   article
  // )

  return comment
}
export default resolver

import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToDeleteCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { COMMENT_STATE } from 'common/enums'

const resolver: MutationToDeleteCommentResolver = async (
  _,
  { input: { id } },
  {
    viewer,
    dataSources: { commentService, articleService, notificationService }
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

  await commentService.baseUpdateById(dbId, {
    state: COMMENT_STATE.archived
  })

  // trigger notificaiton
  const article = await articleService.dataloader.load(articleId)
  notificationService.trigger({
    event: 'article_updated',
    entities: [
      {
        type: 'target',
        entityTable: 'article',
        entity: article
      }
    ]
  })

  return true
}
export default resolver

import { MutationToPinCommentResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { ForbiddenError, AuthenticationError } from 'common/errors'

const resolver: MutationToPinCommentResolver = async (
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
  const { articleId } = await commentService.dataloader.load(dbId)
  const { authorId } = await articleService.dataloader.load(articleId)

  if (authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }

  const comment = await commentService.baseUpdate(dbId, {
    pinned: false
  })

  return comment
}

export default resolver

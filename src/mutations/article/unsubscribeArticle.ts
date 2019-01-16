import { AuthenticationError, ForbiddenError } from 'apollo-server'
import { MutationToUnsubscribeArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUnsubscribeArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ForbiddenError('target article does not exists')
  }

  const subscribed = await articleService.isSubscribed({
    targetId: article.id,
    userId: viewer.id
  })

  if (!subscribed) {
    throw new ForbiddenError('subscription does not exists')
  }

  articleService.unsubscribe(article.id, viewer.id)

  return true
}

export default resolver

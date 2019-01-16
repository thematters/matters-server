import { AuthenticationError } from 'apollo-server'
import { MutationToUnsubscribeArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: MutationToUnsubscribeArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('anonymous user cannot do this') // TODO
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  const subscribed = await articleService.isSubscribed({
    targetId: article.id,
    userId: viewer.id
  })

  if (!subscribed) {
    throw new Error('subscription does not exists') // TODO
  }

  articleService.unsubscribe(article.id, viewer.id)

  return true
}

export default resolver

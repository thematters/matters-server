import { Resolver } from 'definitions'
import { fromGlobalId } from 'common/utils'

const resolver: Resolver = async (
  root,
  { input: { id } },
  { viewer, articleService }
) => {
  if (!viewer) {
    throw new Error('anonymous user cannot do this') // TODO
  }
  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.idLoader.load(dbId)
  if (!article) {
    throw new Error('target article does not exists') // TODO
  }

  const subscriptions = await articleService.findSubscriptionByTargetIdAndUserId(
    article.id,
    viewer.id
  )

  if (subscriptions.length <= 0) {
    articleService.subscribe(article.id, viewer.id)
  }

  return true
}

export default resolver

import { MutationToSubscribeArticleResolver } from 'definitions'
import { fromGlobalId } from 'common/utils'
import { ArticleNotFoundError, AuthenticationError } from 'common/errors'

const resolver: MutationToSubscribeArticleResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { articleService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.dataloader.load(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  await articleService.subscribe(article.id, viewer.id)

  // trigger notifications
  notificationService.trigger({
    event: 'article_new_subscriber',
    actorId: viewer.id,
    recipientId: article.authorId,
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

import { CACHE_KEYWORD, NODE_TYPES } from 'common/enums'
import { ArticleNotFoundError, AuthenticationError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToSubscribeArticleResolver } from 'definitions'

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

  // Add custom data for cache invalidation
  article[CACHE_KEYWORD] = [
    {
      id: article.id,
      type: NODE_TYPES.article
    },
    {
      id: article.authorId,
      type: NODE_TYPES.user
    }
  ]

  return article
}

export default resolver

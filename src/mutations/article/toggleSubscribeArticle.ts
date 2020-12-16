import { DB_NOTICE_TYPE, USER_STATE } from 'common/enums'
import {
  ArticleNotFoundError,
  AuthenticationError,
  ForbiddenByStateError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToToggleSubscribeArticleResolver } from 'definitions'

const resolver: MutationToToggleSubscribeArticleResolver = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { articleService, draftService, notificationService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  const article = await articleService.baseFindById(dbId)
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  // determine action
  let action: 'subscribe' | 'unsubscribe'
  if (enabled === undefined) {
    const userSubscribe = await articleService.findUserSubscribe(
      article.id,
      viewer.id
    )
    action = !!userSubscribe ? 'unsubscribe' : 'subscribe'
  } else {
    action = enabled ? 'subscribe' : 'unsubscribe'
  }

  // run action
  if (action === 'subscribe') {
    await articleService.subscribe(article.id, viewer.id)

    // trigger notifications
    notificationService.trigger({
      event: DB_NOTICE_TYPE.article_new_subscriber,
      actorId: viewer.id,
      recipientId: article.authorId,
      entities: [
        {
          type: 'target',
          entityTable: 'article',
          entity: article,
        },
      ],
    })
  } else {
    await articleService.unsubscribe(article.id, viewer.id)
  }

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver

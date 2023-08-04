import type { GQLMutationResolvers } from 'definitions'

import {
  ARTICLE_STATE,
  DB_NOTICE_TYPE,
  USER_ACTION,
  USER_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  AuthenticationError,
  ForbiddenByStateError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleSubscribeArticle'] = async (
  root,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService, draftService, notificationService } }
) => {
  // checks
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  // banned and archived articles shall still be abled to be unsubscribed
  const article =
    enabled === false
      ? await atomService.findFirst({
          table: 'article',
          where: { id: dbId },
          whereIn: [
            'state',
            [
              ARTICLE_STATE.active,
              ARTICLE_STATE.archived,
              ARTICLE_STATE.banned,
            ],
          ],
        })
      : await atomService.findFirst({
          table: 'article',
          where: { id: dbId, state: ARTICLE_STATE.active },
        })
  if (!article) {
    throw new ArticleNotFoundError('target article does not exists')
  }

  // determine action
  let action: 'subscribe' | 'unsubscribe'
  if (enabled === undefined) {
    const userSubscribe = await atomService.findFirst({
      table: 'action_article',
      where: {
        targetId: article.id,
        userId: viewer.id,
        action: USER_ACTION.subscribe,
      },
    })
    action = userSubscribe ? 'unsubscribe' : 'subscribe'
  } else {
    action = enabled ? 'subscribe' : 'unsubscribe'
  }

  // run action
  if (action === 'subscribe') {
    const data = {
      targetId: article.id,
      userId: viewer.id,
      action: USER_ACTION.subscribe,
    }
    await atomService.upsert({
      table: 'action_article',
      where: data,
      create: data,
      update: { ...data, updatedAt: new Date() },
    })

    // trigger notifications
    notificationService.trigger({
      event: DB_NOTICE_TYPE.article_new_subscriber,
      actorId: viewer.id,
      recipientId: article.authorId,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
    })
  } else {
    await atomService.deleteMany({
      table: 'action_article',
      where: {
        targetId: article.id,
        userId: viewer.id,
        action: USER_ACTION.subscribe,
      },
    })
  }

  const node = await draftService.baseFindById(article.draftId)
  return node
}

export default resolver

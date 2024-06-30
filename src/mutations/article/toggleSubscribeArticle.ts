import type { GQLMutationResolvers } from 'definitions'

import {
  ARTICLE_STATE,
  NOTICE_TYPE,
  USER_ACTION,
  USER_STATE,
  ARTICLE_ACTION,
} from 'common/enums'
import {
  ArticleNotFoundError,
  ForbiddenError,
  ForbiddenByStateError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['toggleSubscribeArticle'] = async (
  _,
  { input: { id, enabled } },
  { viewer, dataSources: { atomService, articleService, notificationService } }
) => {
  // checks
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  const { id: dbId } = fromGlobalId(id)
  // banned and archived articles shall still be able to be unsubscribed
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
  const { id: articleVersionId } =
    await articleService.loadLatestArticleVersion(article.id)

  // determine action
  let action: 'subscribe' | 'unsubscribe'
  if (enabled === undefined) {
    const userSubscribe = await atomService.findFirst({
      table: 'action_article',
      where: {
        targetId: article.id,
        userId: viewer.id,
        action: ARTICLE_ACTION.subscribe,
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
      action: ARTICLE_ACTION.subscribe,
    }
    await atomService.upsert({
      table: 'action_article',
      where: data,
      create: { ...data, articleVersionId },
      update: { ...data, articleVersionId },
    })

    // trigger notifications
    notificationService.trigger({
      event: NOTICE_TYPE.article_new_subscriber,
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

  return article
}

export default resolver

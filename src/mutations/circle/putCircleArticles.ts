import _ from 'lodash'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  NODE_TYPES,
  PRICE_STATE,
  SUBSCRIPTION_STATE,
  USER_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, toGlobalId } from 'common/utils'
import { MutationToPutCircleArticlesResolver } from 'definitions'

const resolver: MutationToPutCircleArticlesResolver = async (
  root,
  { input: { id, articles, type: actionType, accessType } },
  {
    viewer,
    dataSources: { atomService, systemService, notificationService },
    knex,
  }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  if (accessType === ARTICLE_ACCESS_TYPE.limitedFree) {
    throw new UserInputError('"accessType" can only be `public` or `paywall`.')
  }

  if (!articles) {
    throw new UserInputError('"articles" is required')
  }

  // check feature is enabled or not
  const feature = await systemService.getFeatureFlag('circle_management')
  if (
    feature &&
    !(await systemService.isFeatureEnabled(feature.flag, viewer))
  ) {
    throw new ForbiddenError('viewer has no permission')
  }

  const { id: circleId } = fromGlobalId(id || '')
  const articleIds = articles.map((articleId) => fromGlobalId(articleId).id)
  const [circle, targetArticles] = await Promise.all([
    atomService.findFirst({
      table: 'circle',
      where: { id: circleId, state: CIRCLE_STATE.active },
    }),
    atomService.findMany({
      table: 'article',
      whereIn: ['id', articleIds],
      where: {
        authorId: viewer.id,
        state: ARTICLE_STATE.active,
      },
    }),
  ])
  const targetArticleIds = targetArticles.map((a) => a.id)

  if (!circle) {
    throw new CircleNotFoundError(`circle ${id} not found`)
  }
  if (!targetArticles || targetArticles.length <= 0) {
    throw new ArticleNotFoundError('articles not found')
  }

  // check ownership
  const isOwner = circle.owner === viewer.id
  if (!isOwner) {
    throw new ForbiddenError('only circle owner has the access')
  }

  const checkPaywalledArticles = async () => {
    const paywalledArticles = await atomService.findMany({
      table: 'article_circle',
      where: { circleId: circle.id, access: ARTICLE_ACCESS_TYPE.paywall },
      whereIn: ['article_id', targetArticleIds],
    })
    const hasPaywalledArticles =
      paywalledArticles && paywalledArticles.length > 0

    if (hasPaywalledArticles) {
      const paywalledArticleIds = paywalledArticles.map((a) =>
        toGlobalId({ type: 'Article', id: a.id })
      )
      throw new ForbiddenError(
        `forbid to perform the action on paywalled articles: ${paywalledArticleIds.join(
          ', '
        )}.`
      )
    }
  }

  // add articles to circle
  if (actionType === 'add') {
    if (accessType === ARTICLE_ACCESS_TYPE.public) {
      await checkPaywalledArticles()
    }

    // retrieve circle members and followers
    const members = await knex
      .from('circle_subscription_item as csi')
      .join('circle_price', 'circle_price.id', 'csi.price_id')
      .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
      .where({
        'circle_price.circle_id': circleId,
        'circle_price.state': PRICE_STATE.active,
        'csi.archived': false,
      })
      .whereIn('cs.state', [
        SUBSCRIPTION_STATE.active,
        SUBSCRIPTION_STATE.trialing,
      ])
    const followers = await atomService.findMany({
      table: 'action_circle',
      select: ['user_id'],
      where: { targetId: circleId, action: CIRCLE_ACTION.follow },
    })
    const recipients = _.uniq([
      ...members.map((m) => m.userId),
      ...followers.map((f) => f.userId),
    ])

    for (const article of targetArticles) {
      const data = {
        articleId: article.id,
        circleId: circle.id,
      }
      await atomService.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: accessType },
        update: { ...data, access: accessType, updatedAt: new Date() },
      })

      // notify
      recipients.forEach((recipientId: any) => {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.circle_new_article,
          recipientId,
          entities: [
            {
              type: 'target',
              entityTable: 'article',
              entity: article,
            },
          ],
        })
      })
    }
  }
  // remove articles from circle
  else if (actionType === 'remove') {
    await checkPaywalledArticles()

    await atomService.deleteMany({
      table: 'article_circle',
      where: { circleId: circle.id },
      whereIn: ['article_id', targetArticleIds],
    })
  }

  // invalidate articles
  circle[CACHE_KEYWORD] = targetArticles.map((articleId) => ({
    id: articleId,
    type: NODE_TYPES.article,
  }))
  return circle
}

export default resolver

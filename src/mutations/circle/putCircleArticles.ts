import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  ARTICLE_STATE,
  CACHE_KEYWORD,
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
import { fromGlobalId } from 'common/utils'
import { MutationToPutCircleArticlesResolver } from 'definitions'

const resolver: MutationToPutCircleArticlesResolver = async (
  root,
  { input: { id, articles, type } },
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

  // retrieve circle members
  const circleMembers = await knex
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

  switch (type) {
    case 'add':
      for (const article of targetArticles) {
        const data = { articleId: article.id, circleId: circle.id }
        await atomService.upsert({
          table: 'article_circle',
          where: data,
          create: data,
          update: data,
        })

        // notify cirlce members
        circleMembers.forEach((member: any) => {
          notificationService.trigger({
            event: DB_NOTICE_TYPE.circle_new_article,
            recipientId: member.userId,
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
      break
    case 'remove':
      throw new ForbiddenError(
        `removing articles from circle is unsupported now.`
      )
      // await atomService.deleteMany({
      //   table: 'article_circle',
      //   where: { circleId: circle.id },
      //   whereIn: ['article_id', targetArticleIds],
      // })
      break
  }

  // invalidate articles
  circle[CACHE_KEYWORD] = targetArticles.map((articleId) => ({
    id: articleId,
    type: NODE_TYPES.article,
  }))
  return circle
}

export default resolver

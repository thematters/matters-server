import type { GQLMutationResolvers, Article, Circle } from 'definitions'

import { uniq } from 'lodash'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  PRICE_STATE,
  USER_STATE,
  SUBSCRIPTION_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  ArticleRevisionReachLimitError,
  AuthenticationError,
  CircleNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putCircleArticles'] = async (
  _,
  { input: { id, articles, type: actionType, accessType, license } },
  {
    viewer,
    dataSources: {
      atomService,
      systemService,
      articleService,
      notificationService,
      connections: { knex },
      queues: { revisionQueue },
    },
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
      where: { id: circleId, owner: viewer.id, state: CIRCLE_STATE.active },
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

  const republish = async (article: Article) => {
    const revisionCount = article.revisionCount || 0
    if (revisionCount >= MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }

    // fetch updated data before create draft
    const [oldArticleVersion] = await Promise.all([
      articleService.loadLatestArticleVersion(article.id),
      articleService.findConnections({ entranceId: article.id }),
    ])
    // add job to publish queue
    const newArticleVersion = await articleService.createNewArticleVersion(
      article.id,
      viewer.id,
      { license: license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4 }
    )
    revisionQueue.publishRevisedArticle({
      articleId: article.id,
      oldArticleVersionId: oldArticleVersion.id,
      newArticleVersionId: newArticleVersion.id,
    })
  }

  // add or remove articles from circle
  const targetArticleIds = targetArticles.map((a) => a.id)

  // add articles to circle
  if (actionType === 'add') {
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
      select: ['userId'],
      where: { targetId: circleId, action: CIRCLE_ACTION.follow },
    })
    const recipients = uniq([
      ...members.map((m) => m.userId),
      ...followers.map((f) => f.userId),
    ])

    for (const article of targetArticles) {
      const data = { articleId: article.id, circleId: circle.id }
      await atomService.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: accessType },
        update: {
          ...data,
          access: accessType,
        },
      })

      await republish(article)

      // notify
      recipients.forEach((recipientId: string) => {
        notificationService.trigger({
          event: DB_NOTICE_TYPE.circle_new_article,
          recipientId,
          entities: [
            { type: 'target', entityTable: 'article', entity: article },
          ],
        })
      })
    }
  }
  // remove articles from circle
  else if (actionType === 'remove') {
    await atomService.deleteMany({
      table: 'article_circle',
      where: { circleId: circle.id },
      whereIn: ['article_id', targetArticleIds],
    })

    for (const article of targetArticles) {
      await republish(article)
    }
  }

  // invalidate articles
  articleService.latestArticleVersionLoader.clearAll()
  ;(circle as Circle & { [CACHE_KEYWORD]: any })[CACHE_KEYWORD] =
    targetArticles.map((article) => ({
      id: article.id,
      type: NODE_TYPES.Article,
    }))
  return circle
}

export default resolver

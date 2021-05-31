import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_ACCESS_TYPE,
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_ACTION,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  PRICE_STATE,
  PUBLISH_STATE,
  SUBSCRIPTION_STATE,
  USER_STATE,
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
import { correctHtml, fromGlobalId, sanitize } from 'common/utils'
import { revisionQueue } from 'connectors/queue'
import { MutationToPutCircleArticlesResolver } from 'definitions'

const resolver: MutationToPutCircleArticlesResolver = async (
  root,
  { input: { id, articles, type: actionType, accessType, license } },
  {
    viewer,
    dataSources: {
      atomService,
      systemService,
      draftService,
      tagService,
      articleService,
      notificationService,
    },
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

  const republish = async (article: any) => {
    const revisionCount = article.revisionCount || 0
    if (revisionCount >= MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }

    // fetch updated data before create draft
    const [
      currDraft,
      currArticle,
      currCollections,
      currTags,
      currArticleCircle,
    ] = await Promise.all([
      draftService.baseFindById(article.draftId), // fetch latest draft
      articleService.baseFindById(article.id), // fetch latest article
      articleService.findCollections({ entranceId: article.id, limit: null }),
      tagService.findByArticleId({ articleId: article.id }),
      knex
        .select('article_circle.*')
        .from('article_circle')
        .join('circle', 'article_circle.circle_id', 'circle.id')
        .where({
          'article_circle.article_id': article.id,
          'circle.state': CIRCLE_STATE.active,
        })
        .first(),
    ])
    const currTagContents = currTags.map((currTag) => currTag.content)
    const currCollectionIds = currCollections.map(
      ({ articleId }: { articleId: string }) => articleId
    )

    // create draft linked to this article
    const pipe = _.flow(sanitize, correctHtml)
    const data: Record<string, any> = {
      uuid: v4(),
      authorId: currDraft.authorId,
      articleId: currArticle.id,
      title: currDraft.title,
      summary: currDraft.summary,
      summaryCustomized: currDraft.summaryCustomized,
      content: pipe(currDraft.content),
      tags: currTagContents,
      cover: currArticle.cover,
      collection: currCollectionIds,
      archived: false,
      publishState: PUBLISH_STATE.pending,
      circleId: currArticleCircle?.circleId,
      access: currArticleCircle?.access,
      license: currDraft?.license,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const revisedDraft = await draftService.baseCreate(data)

    // add job to publish queue
    revisionQueue.publishRevisedArticle({
      draftId: revisedDraft.id,
    })
  }

  const editLicense = async (draftId: string) => {
    const isARR = license === ARTICLE_LICENSE_TYPE.arr
    const isPaywall = accessType === ARTICLE_ACCESS_TYPE.paywall

    if (isARR && !isPaywall) {
      throw new ForbiddenError(
        'ARR (All Right Reserved) license can only be used by paywalled content.'
      )
    }

    await atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: {
        license: license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
        updatedAt: new Date(),
      },
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
      select: ['user_id'],
      where: { targetId: circleId, action: CIRCLE_ACTION.follow },
    })
    const recipients = _.uniq([
      ...members.map((m) => m.userId),
      ...followers.map((f) => f.userId),
    ])

    for (const article of targetArticles) {
      const data = { articleId: article.id, circleId: circle.id }
      await atomService.upsert({
        table: 'article_circle',
        where: data,
        create: { ...data, access: accessType },
        update: { ...data, access: accessType, updatedAt: new Date() },
      })

      await editLicense(article.draftId)
      await republish(article)

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
    await atomService.deleteMany({
      table: 'article_circle',
      where: { circleId: circle.id },
      whereIn: ['article_id', targetArticleIds],
    })

    for (const article of targetArticles) {
      await editLicense(article.draftId)
      await republish(article)
    }
  }

  // invalidate articles
  circle[CACHE_KEYWORD] = targetArticles.map((article) => ({
    id: article.id,
    type: NODE_TYPES.Article,
  }))
  return circle
}

export default resolver

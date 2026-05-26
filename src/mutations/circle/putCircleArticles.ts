import type {
  GQLMutationResolvers,
  Article,
  Circle,
} from '#definitions/index.js'
import type { GlobalId } from '#definitions/nominal.js'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  USER_STATE,
} from '#common/enums/index.js'
import {
  ArticleNotFoundError,
  ArticleRevisionReachLimitError,
  AuthenticationError,
  CircleNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId } from '#common/utils/index.js'

const resolver: GQLMutationResolvers['putCircleArticles'] = async (
  _,
  { input: { id, articles, type: actionType, license } },
  {
    viewer,
    dataSources: {
      atomService,
      systemService,
      articleService,
      queues: { revisionQueue },
      publicationService,
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

  const { id: circleId } = fromGlobalId(id as GlobalId)
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
    const newArticleVersion = await publicationService.createNewArticleVersion(
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

  // FEATURE IS SUNSETTING: articles can no longer be added to circles
  if (actionType === 'add') {
    throw new ForbiddenError('articles can no longer be added to circles')
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

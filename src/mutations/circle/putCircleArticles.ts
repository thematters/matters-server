import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  PUBLISH_STATE,
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
import {
  GQLArticleAccessType,
  GQLPutCircleArticlesType,
  ItemData,
  MutationToPutCircleArticlesResolver,
} from 'definitions'

const resolver: MutationToPutCircleArticlesResolver = async (
  root,
  { input: { id, articles, type: actionType, accessType } },
  {
    viewer,
    dataSources: {
      atomService,
      systemService,
      draftService,
      tagService,
      articleService,
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

  const republish = async ({
    article,
    circleId: republishCircleId,
    articleAccessType,
    articleCircleActionType,
  }: {
    article: any
    circleId: string
    articleAccessType: GQLArticleAccessType
    articleCircleActionType: GQLPutCircleArticlesType
  }) => {
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
    const data: ItemData = {
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
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const revisedDraft = await draftService.baseCreate(data)

    // add job to publish queue
    revisionQueue.publishRevisedArticle({
      draftId: revisedDraft.id,
      circleInfo: {
        circleId: republishCircleId,
        accessType: articleAccessType,
        articleCircleActionType,
      },
    })
  }

  // add or remove articles from circle
  for (const article of targetArticles) {
    await republish({
      article,
      circleId,
      articleAccessType: accessType,
      articleCircleActionType: actionType,
    })
  }

  // invalidate articles
  circle[CACHE_KEYWORD] = targetArticles.map((article) => ({
    id: article.id,
    type: NODE_TYPES.Article,
  }))
  return circle
}

export default resolver

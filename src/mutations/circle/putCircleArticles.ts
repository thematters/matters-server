import _difference from 'lodash/difference'
import _some from 'lodash/some'
import _uniq from 'lodash/uniq'

import {
  ARTICLE_STATE,
  CACHE_KEYWORD,
  NODE_TYPES,
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
  { viewer, dataSources: { atomService, systemService } }
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
    atomService.findUnique({
      table: 'circle',
      where: { id: circleId },
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

  const targetArticleIds = targetArticles.map((article) => article.id)

  switch (type) {
    case 'add':
      for (const articleId of targetArticleIds) {
        const data = { articleId, circleId: circle.id }
        await atomService.upsert({
          table: 'article_circle',
          where: data,
          create: data,
          update: data,
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

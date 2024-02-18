import type { Article, Draft, Circle, GQLMutationResolvers } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'
import {
  normalizeArticleHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLE_CONTENT_REVISION_LENGTH,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  USER_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  ArticleRevisionContentInvalidError,
  ArticleRevisionReachLimitError,
  AssetNotFoundError,
  CircleNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId, measureDiffs } from 'common/utils'

const resolver: GQLMutationResolvers['editArticle'] = async (
  _,
  {
    input: {
      id,
      state,
      sticky,
      pinned,
      tags,
      content,
      summary,
      cover,
      collection,
      circle: circleGlobalId,
      accessType,
      sensitive,
      license,
      requestForDonation,
      replyToDonator,
      iscnPublish,
      canComment,
      description,
    },
  },
  {
    viewer,
    dataSources: {
      articleService,
      atomService,
      systemService,
      queues: { revisionQueue },
    },
  }
) => {
  if (!viewer.userName) {
    throw new ForbiddenError('user has no username')
  }

  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // checks
  const { id: dbId } = fromGlobalId(id)
  let article = await atomService.articleIdLoader.load(dbId)
  const articleVersion = await articleService.loadLatestArticleVersion(
    article.id
  )
  if (!article) {
    throw new ArticleNotFoundError('article does not exist')
  }
  if (!articleVersion) {
    throw new ArticleNotFoundError('article version does not exist')
  }
  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
  }
  if (article.state !== ARTICLE_STATE.active) {
    throw new ForbiddenError('only active article is allowed to be edited.')
  }

  /**
   * Archive
   */
  if (state && state !== ARTICLE_STATE.archived) {
    throw new ForbiddenError(
      `"state" only supports "${ARTICLE_STATE.archived}".`
    )
  }
  if (state === ARTICLE_STATE.archived) {
    return articleService.archive(dbId)
  }

  /**
   * Pinned or Sticky
   */
  const isPinned = pinned ?? sticky
  if (typeof isPinned === 'boolean') {
    article = await articleService.updatePinned(article.id, viewer.id, isPinned)
  }

  // collect new article version data
  let data: Partial<Draft> = {}
  let updateRevisionCount = false
  const checkRevisionCount = (newRevisionCount: number) => {
    if (newRevisionCount >= MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }
  }

  /**
   * Tags
   */
  if (tags !== undefined) {
    data = { ...data, tags }
  }

  /**
   * Cover
   */
  const resetCover = cover === null
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)

    if (
      !asset ||
      [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('article cover does not exists')
    }

    data = { ...data, cover: asset.id }
  } else if (resetCover) {
    data = { ...data, cover: null }
  }

  /**
   * Connection
   */
  if (collection !== undefined) {
    data = {
      ...data,
      collection: (collection ?? []).map(
        (globalId) => fromGlobalId(globalId as unknown as string).id
      ),
    }
  }

  /**
   * Circle
   */
  const currAccess = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId: article.id },
  })
  const resetCircle = currAccess && circleGlobalId === null
  let circle: Circle

  if (circleGlobalId) {
    const { id: circleId } = fromGlobalId(circleGlobalId)
    circle = await atomService.findFirst({
      table: 'circle',
      where: { id: circleId, state: CIRCLE_STATE.active },
    })

    if (!circle) {
      throw new CircleNotFoundError(`Cannot find circle ${circleGlobalId}`)
    } else if (circle.owner !== viewer.id) {
      throw new ForbiddenError(
        `Viewer isn't the owner of circle ${circleGlobalId}.`
      )
    } else if (circle.state !== CIRCLE_STATE.active) {
      throw new ForbiddenError(`Circle ${circleGlobalId} cannot be added.`)
    }

    if (!accessType) {
      throw new UserInputError('"accessType" is required on `circle`.')
    }

    if (
      circle.id !== currAccess?.circleId ||
      (circle.id === currAccess?.circleId && accessType !== currAccess?.access)
    ) {
      checkRevisionCount(article.revisionCount + 1)
      updateRevisionCount = true
    }

    data = { ...data, circleId, access: accessType }
  } else if (resetCircle) {
    data = { ...data, circleId: null }
  }

  /**
   * Summary
   */
  if (summary !== undefined) {
    data = { ...data, summary }
  }

  /**
   * License
   */
  if (license === ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2) {
    throw new UserInputError(
      `${ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2} is not longer in use`
    )
  }
  if (license && license !== articleVersion.license) {
    data = { ...data, license }
  }

  /**
   * Support settings
   */
  if (requestForDonation !== undefined) {
    data = { ...data, requestForDonation }
  }
  if (replyToDonator !== undefined) {
    data = { ...data, replyToDonator }
  }

  /**
   * Comment settings
   */
  if (canComment !== undefined && canComment !== articleVersion.canComment) {
    if (canComment === true) {
      data = { ...data, canComment }
    } else {
      throw new ForbiddenError(`canComment can not be turned off`)
    }
  }

  /**
   * Sensitive settings
   */
  if (
    sensitive !== undefined &&
    sensitive !== articleVersion.sensitiveByAuthor
  ) {
    data = { ...data, sensitiveByAuthor: sensitive }
  }

  /**
   * Republish article if content or access is changed
   */
  if (content) {
    if (content.length > MAX_ARTICLE_CONTENT_LENGTH) {
      throw new UserInputError('content reach length limit')
    }

    // check diff distances reaches limit or not
    const { content: lastContent } =
      await atomService.articleContentIdLoader.load(articleVersion.contentId)
    const diffs = measureDiffs(
      stripHtml(normalizeArticleHTML(lastContent)),
      stripHtml(normalizeArticleHTML(content))
    )
    if (diffs > MAX_ARTICLE_CONTENT_REVISION_LENGTH) {
      throw new ArticleRevisionContentInvalidError('revised content invalid')
    }

    if (diffs > 0) {
      data = { ...data, content: normalizeArticleHTML(sanitizeHTML(content)) }
    }
  }

  if (Object.keys(data).length > 0) {
    const newArticleVersion = await articleService.createNewArticleVersion(
      article.id,
      viewer.id,
      data,
      description
    )
    if (updateRevisionCount) {
      await atomService.update({
        table: 'article',
        where: { id: article.id },
        data: { revisionCount: article.revisionCount + 1 },
      })
    }
    revisionQueue.publishRevisedArticle({
      articleId: article.id,
      newArticleVersionId: newArticleVersion.id,
      oldArticleVerisionId: articleVersion.id,
      iscnPublish,
    })
  }

  // fetch lastest article data
  const node = await atomService.findUnique({
    table: 'article',
    where: { id: dbId },
  })
  articleService.latestArticleVersionLoader.clearAll()

  // invalidate circle
  if (circleGlobalId) {
    ;(
      node as Article & {
        [CACHE_KEYWORD]: Array<{ id: string; type: string }>
      }
    )[CACHE_KEYWORD] = [
      {
        id: fromGlobalId(circleGlobalId).id,
        type: NODE_TYPES.Circle,
      },
    ]
  }

  return node
}

export default resolver

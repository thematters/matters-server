import type {
  Article,
  Draft,
  Circle,
  GQLMutationResolvers,
} from '#definitions/index.js'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_TITLE_LENGTH,
  MAX_ARTICLE_SUMMARY_LENGTH,
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLE_REVISION_COUNT,
  NODE_TYPES,
  MAX_CONTENT_LINK_TEXT_LENGTH,
} from '#common/enums/index.js'
import {
  ArticleRevisionReachLimitError,
  AssetNotFoundError,
  CircleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, stripHtml } from '#common/utils/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const {
  normalizeArticleHTML,
  sanitizeHTML,
} = require('@matters/matters-editor/transformers')

const resolver: GQLMutationResolvers['editArticle'] = async (
  _,
  {
    input: {
      id: globalId,
      state,
      pinned,
      tags,
      title,
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
      indentFirstLine,
      description,
      campaigns,
    },
  },
  {
    viewer,
    dataSources: {
      userService,
      articleService,
      atomService,
      systemService,
      campaignService,
      queues: { revisionQueue },
      connections: { redis },
    },
  }
) => {
  userService.validateUserState(viewer)

  // checks
  const { id } = fromGlobalId(globalId)
  const [article, articleVersion] = await articleService.validateArticle(id)

  if (article.authorId !== viewer.id) {
    throw new ForbiddenError('viewer has no permission')
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
    // purge author cache, article cache invalidation already in directive
    invalidateFQC({
      node: { type: NODE_TYPES.User, id: article.authorId },
      redis,
    })
    return articleService.archive(id)
  }

  /**
   * Pinned
   */
  const isPinned = pinned
  if (typeof isPinned === 'boolean') {
    await articleService.updatePinned(article.id, viewer.id, isPinned)
  }

  // collect new article version data
  let data: Partial<Draft> = {}
  let updateRevisionCount = false
  const checkRevisionCount = (newRevisionCount: number) => {
    if (newRevisionCount > MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }
  }

  /**
   * title
   */
  if (title !== undefined) {
    const _title = (title ?? '').trim()
    if (_title.length > MAX_ARTICLE_TITLE_LENGTH) {
      throw new UserInputError('title reach length limit')
    }
    if (_title.length === 0) {
      throw new UserInputError('title cannot be empty')
    }
    if (_title !== articleVersion.title) {
      checkRevisionCount(article.revisionCount + 1)
      updateRevisionCount = true
      data = { ...data, title: _title }
    }
  }

  /**
   * Summary
   */
  if (summary !== undefined && summary !== articleVersion.summary) {
    if (summary?.length > MAX_ARTICLE_SUMMARY_LENGTH) {
      throw new UserInputError('summary reach length limit')
    }
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
    data = { ...data, summary: summary ? summary.trim() : null }
  }

  /**
   * Tags
   */
  if (
    tags !== undefined &&
    (tags ?? []).toString() !== articleVersion.tags.toString()
  ) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
    data = { ...data, tags }
  }

  /**
   * Cover
   */
  if (cover !== undefined && cover !== articleVersion.cover) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true

    const resetCover = cover === null

    if (resetCover) {
      data = { ...data, cover: null }
    } else {
      const asset = await systemService.findAssetByUUID(cover)

      if (
        !asset ||
        [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
        asset.authorId !== viewer.id
      ) {
        throw new AssetNotFoundError('article cover does not exists')
      }

      data = { ...data, cover: asset.id }
    }
  }

  /**
   * Connection
   */
  if (collection !== undefined) {
    const connections = (collection ?? []).map(
      (connection) => fromGlobalId(connection).id
    )

    if (connections.toString() !== articleVersion.connections.toString()) {
      checkRevisionCount(article.revisionCount + 1)
      updateRevisionCount = true
    }

    data = {
      ...data,
      connections,
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
      data = { ...data, circleId, access: accessType }
    }
  } else if (resetCircle) {
    data = { ...data, circleId: null }
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
   * Indent settings
   */
  if (
    indentFirstLine !== undefined &&
    indentFirstLine !== articleVersion.indentFirstLine
  ) {
    data = { ...data, indentFirstLine }
  }

  /**
   * campaigns
   */
  if (campaigns !== undefined) {
    // skip if article is a campaign announcement
    const campaignAnnouncement = await atomService.findFirst({
      table: 'campaign_article',
      where: { articleId: article.id, announcement: true },
    })

    if (!campaignAnnouncement) {
      const _campaigns = await campaignService.validateCampaigns(
        campaigns ?? [],
        viewer.id
      )
      const mutated = await campaignService.updateArticleCampaigns(
        article,
        _campaigns.map(({ campaign, stage }) => ({
          campaignId: campaign,
          campaignStageId: stage,
        }))
      )
      for (const campaignId of mutated) {
        invalidateFQC({
          node: { type: NODE_TYPES.Campaign, id: campaignId },
          redis,
        })
      }
    }
  }

  /**
   * Republish article if content or access is changed
   */
  if (content) {
    if (stripHtml(content).length > MAX_ARTICLE_CONTENT_LENGTH) {
      throw new UserInputError('content reach length limit')
    }

    // check diff distances reaches limit or not
    const { content: lastContent } =
      await atomService.articleContentIdLoader.load(articleVersion.contentId)
    const processed = normalizeArticleHTML(
      sanitizeHTML(content, { maxHardBreaks: -1, maxSoftBreaks: -1 }),
      {
        truncate: {
          maxLength: MAX_CONTENT_LINK_TEXT_LENGTH,
          keepProtocol: false,
        },
      }
    )
    const changed = processed !== lastContent

    if (changed) {
      checkRevisionCount(article.revisionCount + 1)
      updateRevisionCount = true
      data = { ...data, content: processed }
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
      oldArticleVersionId: articleVersion.id,
      iscnPublish,
    })
  }

  // fetch latest article data
  const node = await atomService.findUnique({
    table: 'article',
    where: { id },
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

import type {
  Article,
  ArticleVersion,
  Draft,
  GQLMutationResolvers,
  GlobalId,
  GQLArticleLicenseType,
} from '#definitions/index.js'
import type { Redis } from 'ioredis'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
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
  CircleNotFoundError,
  ForbiddenError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, stripHtml } from '#common/utils/index.js'
import {
  AtomService,
  CampaignService,
  ArticleService,
  CollectionService,
} from '#connectors/index.js'
import { invalidateFQC } from '@matters/apollo-response-cache'
import pkg from 'lodash'
import { createRequire } from 'node:module'

const { isUndefined, omitBy } = pkg

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
      connections,
      collections,
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
      publicationService,
      atomService,
      systemService,
      campaignService,
      collectionService,
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

  /**
   * Campaigns
   */
  if (campaigns !== undefined) {
    await handleCampaigns({
      campaigns,
      article,
      viewerId: viewer.id,
      atomService,
      campaignService,
      redis,
    })
  }

  /**
   * Collections
   */
  if (collections !== undefined) {
    await handleCollections({
      collections,
      article,
      viewerId: viewer.id,
      collectionService,
    })
  }

  // collect new article version data
  const connectionsGlobalIds = connections ?? collection
  const data: Partial<Draft> = omitBy(
    {
      title: title === undefined ? undefined : normalizeAndValidateTitle(title),
      summary:
        summary === undefined
          ? undefined
          : normalizeAndValidateSummary(summary),
      content: content === undefined ? undefined : validateContent(content),
      tags,
      cover:
        cover &&
        (await systemService.validateArticleCover({
          coverUUID: cover,
          userId: viewer.id,
        })),
      connections:
        connectionsGlobalIds && validateConnections(connectionsGlobalIds),
      access: accessType,
      license:
        license === undefined || license === null
          ? undefined
          : validateLicense(license),
      requestForDonation,
      replyToDonator,
      canComment:
        canComment === undefined || canComment === null
          ? undefined
          : validateCanComment(canComment),
      sensitiveByAuthor: sensitive,
      indentFirstLine,
      circleId:
        circleGlobalId &&
        (await validateCircle({
          circleGlobalId,
          accessType,
          articleId: article.id,
          viewerId: viewer.id,
          atomService,
        })),
    },
    isUndefined
  )

  if (Object.keys(data).length > 0) {
    const { updateRevisionCount, contentChanged } = await validateRevision({
      article,
      articleVersion,
      data,
      articleService,
    })

    const newArticleVersion = await publicationService.createNewArticleVersion(
      article.id,
      viewer.id,
      data,
      description
    )
    // republish article if content is changed

    if (updateRevisionCount) {
      await atomService.update({
        table: 'article',
        where: { id: article.id },
        data: { revisionCount: article.revisionCount + 1 },
      })
    }

    if (contentChanged) {
      revisionQueue.publishRevisedArticle({
        articleId: article.id,
        newArticleVersionId: newArticleVersion.id,
        oldArticleVersionId: articleVersion.id,
        iscnPublish,
      })
    }
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

// helpers

const handleCampaigns = async ({
  campaigns,
  article,
  viewerId,
  atomService,
  campaignService,
  redis,
}: {
  campaigns: Array<{ campaign: GlobalId; stage?: GlobalId }> | null
  article: Article
  viewerId: string
  atomService: AtomService
  campaignService: CampaignService
  redis: Redis
}) => {
  // skip if article is a campaign announcement
  const campaignAnnouncement = await atomService.findFirst({
    table: 'campaign_article',
    where: { articleId: article.id, announcement: true },
  })

  if (!campaignAnnouncement) {
    const _campaigns = await campaignService.validateCampaigns(
      campaigns ?? [],
      viewerId
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

const handleCollections = async ({
  collections,
  article,
  viewerId,
  collectionService,
}: {
  collections: GlobalId[] | null
  article: Article
  viewerId: string
  collectionService: CollectionService
}) => {
  if (!collections) {
    return
  }

  // Validate collection IDs and permissions
  const collectionIds = collections.map((globalId) => {
    const { id, type } = fromGlobalId(globalId)
    if (type !== NODE_TYPES.Collection) {
      throw new UserInputError('Invalid collection id')
    }
    return id
  })

  const currentCollectionIds = (
    await collectionService.findByArticle(article.id)
  ).map(({ id }) => id)

  const collectionsToAdd = collectionIds.filter(
    (collectionId) => !currentCollectionIds.includes(collectionId)
  )

  const collectionsToRemove = currentCollectionIds.filter(
    (collectionId) => !collectionIds.includes(collectionId)
  )

  // Add article to collections
  for (const collectionId of collectionsToAdd) {
    await collectionService.addArticles({
      collectionId,
      articleIds: [article.id],
      userId: viewerId,
    })
  }

  for (const collectionId of collectionsToRemove) {
    await collectionService.removeArticles({
      collectionId,
      articleIds: [article.id],
    })
  }
}

const normalizeAndValidateTitle = (title: string | null) => {
  const _title = (title ?? '').trim()
  if (_title.length > MAX_ARTICLE_TITLE_LENGTH) {
    throw new UserInputError('title reach length limit')
  }
  if (_title.length === 0) {
    throw new UserInputError('title cannot be empty')
  }
  return title
}

const normalizeAndValidateSummary = (summary: string | null) => {
  const _summary = (summary ?? '').trim()
  if (_summary.length > MAX_ARTICLE_SUMMARY_LENGTH) {
    throw new UserInputError('summary reach length limit')
  }
  return summary
}
export default resolver

const validateConnections = (globalIds: GlobalId[]) => {
  /**
   * Connection
   */
  return globalIds.map((connection) => {
    const { id, type } = fromGlobalId(connection)
    if (type !== NODE_TYPES.Article) {
      throw new UserInputError('Invalid connections global id')
    }
    return id
  })
}

const validateCircle = async ({
  circleGlobalId,
  accessType,
  articleId,
  viewerId,
  atomService,
}: {
  circleGlobalId: GlobalId
  accessType?: string
  articleId: string
  viewerId: string
  atomService: AtomService
}) => {
  const currAccess = await atomService.findFirst({
    table: 'article_circle',
    where: { articleId: articleId },
  })

  if (circleGlobalId) {
    const { id: circleId } = fromGlobalId(circleGlobalId)
    const circle = await atomService.findFirst({
      table: 'circle',
      where: { id: circleId, state: CIRCLE_STATE.active },
    })

    if (!circle) {
      throw new CircleNotFoundError(`Cannot find circle ${circleGlobalId}`)
    } else if (circle.owner !== viewerId) {
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
      return circle.id
    }
  }
}

const validateLicense = (license: GQLArticleLicenseType) => {
  if (license === ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2) {
    throw new UserInputError(
      `${ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2} is not longer in use`
    )
  }
  return license
}

const validateCanComment = (canComment: boolean) => {
  if (canComment === false) {
    throw new ForbiddenError(`canComment can not be turned off`)
  }
  return canComment
}

const validateContent = (content: string | null) => {
  const _content = content ?? ''
  if (stripHtml(_content).length > MAX_ARTICLE_CONTENT_LENGTH) {
    throw new UserInputError('content reach length limit')
  }

  const processed = normalizeArticleHTML(
    sanitizeHTML(_content, { maxHardBreaks: -1, maxSoftBreaks: -1 }),
    {
      truncate: {
        maxLength: MAX_CONTENT_LINK_TEXT_LENGTH,
        keepProtocol: false,
      },
    }
  )
  return processed
}

const validateRevision = async ({
  article,
  articleVersion,
  data,
  articleService,
}: {
  article: Article
  articleVersion: ArticleVersion
  data: Partial<Draft>
  articleService: ArticleService
}) => {
  // title summary tag cover, connections, content
  let updateRevisionCount = false
  let contentChanged = false
  const checkRevisionCount = (newRevisionCount: number) => {
    if (newRevisionCount > MAX_ARTICLE_REVISION_COUNT) {
      throw new ArticleRevisionReachLimitError(
        'number of revisions reach limit'
      )
    }
  }

  // title
  if (data.title !== undefined && data.title !== articleVersion.title) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
  }

  // summary
  if (data.summary !== undefined && data.summary !== articleVersion.summary) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
  }

  // cover
  if (data.cover !== undefined && data.cover !== articleVersion.cover) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
  }

  // content
  if (data.content !== undefined) {
    const oldContent = await articleService.loadLatestArticleContent(article.id)
    if (oldContent !== data.content) {
      checkRevisionCount(article.revisionCount + 1)
      updateRevisionCount = true
      contentChanged = true
    }
  }

  // tags
  if (
    data.tags !== undefined &&
    (data.tags ?? []).toString() !== articleVersion.tags.toString()
  ) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
  }

  // connections
  if (
    data.connections !== undefined &&
    (data.connections ?? []).toString() !==
      articleVersion.connections.toString()
  ) {
    checkRevisionCount(article.revisionCount + 1)
    updateRevisionCount = true
  }

  return { updateRevisionCount, contentChanged }
}

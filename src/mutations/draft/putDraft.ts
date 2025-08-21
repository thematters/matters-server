import type { AtomService } from '#connectors/index.js'
import type {
  GQLMutationResolvers,
  Draft,
  GlobalId,
} from '#definitions/index.js'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_SUMMARY_LENGTH,
  MAX_ARTICLE_TITLE_LENGTH,
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  NODE_TYPES,
  PUBLISH_STATE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ArticleCollectionReachLimitError,
  ArticleNotFoundError,
  CircleNotFoundError,
  DraftNotFoundError,
  DraftVersionConflictError,
  ForbiddenError,
  TooManyTagsForArticleError,
  UserInputError,
} from '#common/errors.js'
import { fromGlobalId, stripHtml } from '#common/utils/index.js'
import pkg from 'lodash'
import { createRequire } from 'node:module'

const { isUndefined, omitBy, compact, uniq } = pkg

const require = createRequire(import.meta.url)
const {
  normalizeArticleHTML,
  sanitizeHTML,
} = require('@matters/matters-editor/transformers')

const resolver: GQLMutationResolvers['putDraft'] = async (
  _,
  {
    input: {
      id: globalId,
      title,
      summary,
      content,
      tags,
      cover,
      connections,
      collection,
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
      campaigns,
      lastUpdatedAt,
    },
  },
  {
    viewer,
    dataSources: { userService, atomService, systemService, campaignService },
  }
) => {
  userService.validateUserState(viewer)

  const oldDraft = globalId
    ? await validateDraft({
        globalId,
        viewerId: viewer.id,
        lastUpdatedAt,
        atomService,
      })
    : null
  // Prepare data
  const connectionsGlobalIds = connections || collection
  const data: Partial<Draft> = omitBy(
    {
      authorId: oldDraft ? undefined : viewer.id,
      title: title && normalizeAndValidateTitle(title),
      summary: summary && normalizeAndValidateSummary(summary),
      content: content && normalizeAndValidateContent(content),
      license:
        license === undefined || license === null
          ? undefined
          : validateLicense(license),
      tags:
        tags &&
        (await validateTags({
          tags,
          viewerId: viewer.id,
          draft: oldDraft,
          atomService,
        })),
      cover:
        cover &&
        (await systemService.validateArticleCover({
          coverUUID: cover,
          userId: viewer.id,
        })),
      connections:
        connectionsGlobalIds &&
        (await validateConnections({
          connectionGlobalIds: compact(connectionsGlobalIds),
          draft: oldDraft,
          atomService,
        })),
      collections:
        collections &&
        (await validateCollections({
          collectionGlobalIds: collections,
          viewerId: viewer.id,
          atomService,
        })),
      circleId:
        circleGlobalId &&
        (await validateCircle({
          circleGlobalId,
          viewerId: viewer.id,
          atomService,
          accessType,
        })),
      access: accessType,
      sensitiveByAuthor: sensitive,
      requestForDonation,
      replyToDonator,
      iscnPublish,
      canComment,
      indentFirstLine,
      campaigns:
        campaigns &&
        JSON.stringify(
          await campaignService.validateCampaigns(campaigns, viewer.id)
        ),
    },
    isUndefined
  )

  if (oldDraft) {
    return atomService.update({
      table: 'draft',
      where: { id: oldDraft.id },
      data,
    })
  }

  const draft = await atomService.create({ table: 'draft', data })
  ;(
    draft as Draft & {
      [CACHE_KEYWORD]: Array<{ id: string; type: NODE_TYPES.User }>
    }
  )[CACHE_KEYWORD] = [
    {
      id: viewer.id,
      type: NODE_TYPES.User,
    },
  ]
  return draft
}

// Validation functions

const validateDraft = async ({
  globalId,
  viewerId,
  lastUpdatedAt,
  atomService,
}: {
  globalId: GlobalId
  viewerId: string
  lastUpdatedAt?: Date
  atomService: AtomService
}) => {
  const draft = await atomService.draftIdLoader.load(fromGlobalId(globalId).id)
  if (!draft) {
    throw new DraftNotFoundError('target draft does not exist')
  }
  if (draft.authorId !== viewerId) {
    throw new ForbiddenError('viewer has no permission')
  }
  if (
    draft.publishState === PUBLISH_STATE.pending ||
    draft.publishState === PUBLISH_STATE.published
  ) {
    throw new ForbiddenError('current publishState is not allow to be updated')
  }

  if (
    lastUpdatedAt &&
    new Date(lastUpdatedAt).getTime() !== new Date(draft.updatedAt).getTime()
  ) {
    throw new DraftVersionConflictError(
      'Draft has been modified by another session'
    )
  }

  return draft
}

const validateTags = async ({
  viewerId,
  tags,
  draft,
  atomService,
}: {
  viewerId: string
  tags: string[]
  draft: Draft | null
  atomService: AtomService
}) => {
  if (tags.length === 0) {
    return null
  }
  // validate tag length
  if (draft) {
    // update draft , check tag length compare with old tags and MAX_TAGS_PER_ARTICLE_LIMIT
    const oldTagsLength = draft.tags == null ? 0 : draft.tags.length
    if (
      tags.length > MAX_TAGS_PER_ARTICLE_LIMIT &&
      tags.length > oldTagsLength
    ) {
      throw new TooManyTagsForArticleError(
        `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
      )
    }
  } else {
    // create new draft , check tag length compare with MAX_TAGS_PER_ARTICLE_LIMIT
    if (tags && tags.length > MAX_TAGS_PER_ARTICLE_LIMIT) {
      throw new TooManyTagsForArticleError(
        `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
      )
    }
  }

  // Validate matty tag
  const isMatty = viewerId === environment.mattyId
  const mattyTagId = environment.mattyChoiceTagId
  if (mattyTagId && !isMatty) {
    const mattyTag = await atomService.findUnique({
      table: 'tag',
      where: { id: mattyTagId },
    })
    if (mattyTag && tags.includes(mattyTag.content)) {
      throw new ForbiddenError('not allow to add official tag')
    }
  }
  return tags
}

const validateConnections = async ({
  connectionGlobalIds,
  draft,
  atomService,
}: {
  connectionGlobalIds: GlobalId[]
  draft: Draft | null
  atomService: AtomService
}) => {
  if (connectionGlobalIds.length === 0) {
    return null
  }
  const connections = uniq(
    connectionGlobalIds.map((_id) => {
      const { id, type } = fromGlobalId(_id)
      if (type !== NODE_TYPES.Article) {
        throw new UserInputError(`Invalid connection type: ${type}`)
      }
      return id
    })
  ).filter((articleId) => !!articleId)

  if (draft) {
    const oldConnectionLength =
      draft.connections == null ? 0 : draft.connections.length
    if (
      connectionGlobalIds.length > MAX_ARTICLES_PER_CONNECTION_LIMIT &&
      connectionGlobalIds.length > oldConnectionLength
    ) {
      throw new ArticleCollectionReachLimitError(
        `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in collection`
      )
    }
  } else {
    if (connectionGlobalIds.length > MAX_ARTICLES_PER_CONNECTION_LIMIT) {
      throw new ArticleCollectionReachLimitError(
        `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in collection`
      )
    }
  }

  return Promise.all(
    connections.map(async (articleId) => {
      const article = await atomService.findUnique({
        table: 'article',
        where: { id: articleId },
      })

      if (!article) {
        throw new ArticleNotFoundError(`Cannot find article ${articleId}`)
      }

      if (article.state !== ARTICLE_STATE.active) {
        throw new ForbiddenError(`Article ${articleId} cannot be collected.`)
      }
      return articleId
    })
  )
}

const validateCollections = async ({
  collectionGlobalIds,
  viewerId,
  atomService,
}: {
  collectionGlobalIds: GlobalId[]
  viewerId: string
  atomService: AtomService
}) => {
  if (collectionGlobalIds.length === 0) {
    return null
  }

  const collections = uniq(
    collectionGlobalIds.map((_id) => {
      const { id, type } = fromGlobalId(_id)
      if (type !== NODE_TYPES.Collection) {
        throw new UserInputError(`Invalid collection type: ${type}`)
      }
      return id
    })
  ).filter((collectionId) => !!collectionId)

  return Promise.all(
    collections.map(async (collectionId) => {
      const collection = await atomService.findUnique({
        table: 'collection',
        where: { id: collectionId },
      })

      if (!collection) {
        throw new UserInputError(`Cannot find collection ${collectionId}`)
      }

      if (collection.authorId !== viewerId) {
        throw new ForbiddenError(`Collection ${collectionId} cannot be added.`)
      }

      return collectionId
    })
  )
}

const validateCircle = async ({
  circleGlobalId,
  accessType,
  viewerId,
  atomService,
}: {
  circleGlobalId: GlobalId
  accessType: string | undefined
  viewerId: string
  atomService: AtomService
}) => {
  if (!accessType) {
    throw new UserInputError('"accessType" is required on `circle`.')
  }
  const { id } = fromGlobalId(circleGlobalId)
  const circle = await atomService.findFirst({
    table: 'circle',
    where: { id, state: CIRCLE_STATE.active },
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

  return id
}

// Data transformation functions
const normalizeAndValidateTitle = (title: string) => {
  const _title = title.trim()
  if (_title.length > MAX_ARTICLE_TITLE_LENGTH) {
    throw new UserInputError('title reach length limit')
  }
  return _title
}

const normalizeAndValidateSummary = (summary: string) => {
  const _summary = summary.trim()
  if (_summary.length > MAX_ARTICLE_SUMMARY_LENGTH) {
    throw new UserInputError('summary reach length limit')
  }
  return _summary
}

const normalizeAndValidateContent = (content: string) => {
  const _content = normalizeArticleHTML(sanitizeHTML(content))
  if (stripHtml(_content).length > MAX_ARTICLE_CONTENT_LENGTH) {
    throw new UserInputError('content reach length limit')
  }
  return _content
}

const validateLicense = (license: string) => {
  if (license === ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2) {
    throw new UserInputError(
      `${ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2} is not longer in use`
    )
  }
  return license
}

export default resolver

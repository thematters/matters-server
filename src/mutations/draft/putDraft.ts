import type { AtomService } from '#connectors/index.js'
import type {
  GQLMutationResolvers,
  Draft,
  GlobalId,
  User,
} from '#definitions/index.js'

import {
  ARTICLE_LICENSE_TYPE,
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_ARTICLE_SUMMARY_LENGTH,
  MAX_ARTICLE_TITLE_LENGTH,
  MAX_ARTICLE_CONTENT_LENGTH,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_STATE,
} from '#common/enums/index.js'
import { environment } from '#common/environment.js'
import {
  ArticleCollectionReachLimitError,
  ArticleNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DraftNotFoundError,
  DraftVersionConflictError,
  ForbiddenByStateError,
  ForbiddenError,
  TooManyTagsForArticleError,
  UserInputError,
} from '#common/errors.js'
import {
  extractAssetDataFromHtml,
  fromGlobalId,
  stripHtml,
} from '#common/utils/index.js'
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
      collection: connectionGlobalIds,
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
  { viewer, dataSources: { atomService, systemService, campaignService } }
) => {
  validateUserState(viewer)

  const draft = globalId
    ? await validateDraft({
        globalId,
        viewerId: viewer.id,
        atomService,
      })
    : null
  // Prepare data
  const data: Partial<Draft> = omitBy(
    {
      authorId: draft ? undefined : viewer.id,
      title: title && normalizeAndValidateTitle(title),
      summary: summary && normalizeAndValidateSummary(summary),
      content: content && normalizeAndValidateContent(content),
      license: license && validateLicense(license),
      tags:
        tags &&
        (await validateTags({
          tags,
          viewerId: viewer.id,
          draft,
          atomService,
        })),
      cover:
        cover &&
        (await systemService.validateArticleCover({
          coverUUID: cover,
          userId: viewer.id,
        })),
      collection:
        connectionGlobalIds &&
        (await validateConnections({
          connectionGlobalIds: compact(connectionGlobalIds),
          draft,
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

  if (draft) {
    // Handle candidate cover
    const resetCover = cover === null
    const isUpdateContent = content || content === ''
    if (
      (resetCover && !isUpdateContent) ||
      (resetCover && isUpdateContent && draft.cover) ||
      (!resetCover && isUpdateContent && !draft.cover)
    ) {
      const draftContent = isUpdateContent ? content : draft.content
      const uuids = (
        extractAssetDataFromHtml(draftContent, 'image') || []
      ).filter((uuid) => uuid && uuid !== 'embed')

      if (uuids.length > 0) {
        const candidateCover = await atomService.findFirst({
          table: 'asset',
          where: {
            uuid: uuids[0],
            type: ASSET_TYPE.embed,
            authorId: viewer.id,
          },
        })

        if (candidateCover) {
          data.cover = candidateCover.id
        }
      } else {
        data.cover = null
      }
    }

    // Update draft
    const resetCircle = circleGlobalId === null
    return handleDraftUpdate({
      draft,
      data: {
        ...data,
        circleId: resetCircle ? null : data.circleId,
      },
      lastUpdatedAt,
      atomService,
    })
  }

  return handleDraftCreate({
    data,
    viewerId: viewer.id,
    atomService,
  })
}

// Validation functions

const validateDraft = async ({
  globalId,
  viewerId,
  atomService,
}: {
  globalId: GlobalId
  viewerId: string
  atomService: AtomService
}) => {
  const draft = await atomService.draftIdLoader.load(fromGlobalId(globalId).id)
  if (!draft) {
    throw new DraftNotFoundError('target draft does not exist')
  }
  if (draft.authorId !== viewerId) {
    throw new ForbiddenError('viewer has no permission')
  }
  return draft
}

const validateUserState = (viewer: User) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state as
        | typeof USER_STATE.archived
        | typeof USER_STATE.banned
        | typeof USER_STATE.frozen
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }
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
    connectionGlobalIds.map((_id) => fromGlobalId(_id).id)
  ).filter((articleId) => !!articleId)

  if (draft) {
    const oldConnectionLength =
      draft.collection == null ? 0 : draft.collection.length
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

// Draft update functions
const handleDraftUpdate = async ({
  draft,
  data,
  lastUpdatedAt,
  atomService,
}: {
  draft: Draft
  data: Partial<Draft>
  lastUpdatedAt?: string
  atomService: AtomService
}) => {
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

  return atomService.update({
    table: 'draft',
    where: { id: draft.id },
    data,
  })
}

const handleDraftCreate = async ({
  data,
  viewerId,
  atomService,
}: {
  data: Partial<Draft>
  viewerId: string
  atomService: AtomService
}) => {
  const draft = await atomService.create({ table: 'draft', data })
  ;(
    draft as Draft & {
      [CACHE_KEYWORD]: Array<{ id: string; type: NODE_TYPES.User }>
    }
  )[CACHE_KEYWORD] = [
    {
      id: viewerId,
      type: NODE_TYPES.User,
    },
  ]
  return draft
}

export default resolver

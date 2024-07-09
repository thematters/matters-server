import type { AtomService } from 'connectors'
import type { DataSources, GQLMutationResolvers, Draft } from 'definitions'

import { stripHtml } from '@matters/ipns-site-generator'
import {
  normalizeArticleHTML,
  sanitizeHTML,
} from '@matters/matters-editor/transformers'
import { isUndefined, omitBy, isString, uniq } from 'lodash'

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
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ArticleCollectionReachLimitError,
  ArticleNotFoundError,
  AssetNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  TooManyTagsForArticleError,
  UserInputError,
} from 'common/errors'
import { extractAssetDataFromHtml, fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['putDraft'] = async (
  _,
  {
    input: {
      id,
      title,
      summary,
      content,
      tags,
      cover,
      collection: collectionGlobalId,
      circle: circleGlobalId,
      accessType,
      sensitive,
      license,
      requestForDonation,
      replyToDonator,
      iscnPublish,
      canComment,
      campaigns,
    },
  },
  { viewer, dataSources: { atomService, draftService, systemService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (
    [USER_STATE.archived, USER_STATE.banned, USER_STATE.frozen].includes(
      viewer.state
    )
  ) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
  }

  // check tags
  if (tags) {
    await validateTags({
      viewerId: viewer.id,
      tags,
      dataSources: { atomService },
    })
  }

  // check for asset existence
  let coverId
  if (cover) {
    const asset = await systemService.findAssetByUUID(cover)

    if (
      !asset ||
      [ASSET_TYPE.embed, ASSET_TYPE.cover].indexOf(asset.type) < 0 ||
      asset.authorId !== viewer.id
    ) {
      throw new AssetNotFoundError('Asset does not exists')
    }

    coverId = asset.id
  }

  // check collection
  const collection = collectionGlobalId
    ? uniq(
        collectionGlobalId
          .filter(isString)
          .map((articleId: string) => fromGlobalId(articleId).id)
      ).filter((articleId) => !!articleId)
    : collectionGlobalId // do not convert null or undefined
  if (collection) {
    await validateConnections({
      connections: collection,
      atomService,
    })
  }

  // check circle
  let circleId
  if (circleGlobalId) {
    const { id: cId } = fromGlobalId(circleGlobalId)
    const circle = await atomService.findFirst({
      table: 'circle',
      where: { id: cId, state: CIRCLE_STATE.active },
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

    circleId = cId
  }

  // validate and assemble data
  // TODO: move all validations into functions and call in below data assemble
  const isUpdate = !!id
  const data: Partial<Draft> = omitBy(
    {
      authorId: isUpdate ? undefined : viewer.id,
      title: title && normalizeAndValidateTitle(title),
      summary: summary && normalizeAndValidateSummary(summary),
      content: content && normalizeAndValidateContent(content),
      license: license && validateLicense(license),
      tags: tags?.length === 0 ? null : tags,
      cover: coverId,
      collection: collection?.length === 0 ? null : collection,
      circleId,
      access: accessType,
      sensitiveByAuthor: sensitive,
      requestForDonation,
      replyToDonator,
      iscnPublish,
      canComment,
      campaigns:
        campaigns &&
        JSON.stringify(await validateCampaigns(campaigns, { draftService })),
    },
    isUndefined // to drop only undefined
  )

  if (isUpdate) {
    const { id: dbId } = fromGlobalId(id)
    const draft = await atomService.draftIdLoader.load(dbId)

    // check for draft existence
    if (!draft) {
      throw new DraftNotFoundError('target draft does not exist')
    }

    // check for permission
    if (draft.authorId !== viewer.id) {
      throw new ForbiddenError('viewer has no permission')
    }

    // check for draft state
    if (
      draft.publishState === PUBLISH_STATE.pending ||
      draft.publishState === PUBLISH_STATE.published
    ) {
      throw new ForbiddenError(
        'current publishState is not allow to be updated'
      )
    }

    // check for tags limit
    if (tags) {
      const oldTagsLength = draft.tags == null ? 0 : draft.tags.length
      if (
        tags.length > MAX_TAGS_PER_ARTICLE_LIMIT &&
        tags.length > oldTagsLength
      ) {
        throw new TooManyTagsForArticleError(
          `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
        )
      }
    }

    // check for collection limit
    if (collection) {
      const oldConnectionLength =
        draft.collection == null ? 0 : draft.collection.length
      if (
        collection.length > MAX_ARTICLES_PER_CONNECTION_LIMIT &&
        collection.length > oldConnectionLength
      ) {
        throw new ArticleCollectionReachLimitError(
          `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in collection`
        )
      }
    }

    // handle candidate cover
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

    // update
    const resetCircle = circleGlobalId === null
    return draftService.baseUpdate(dbId, {
      ...data,
      // reset fields
      circleId: resetCircle ? null : data.circleId,
    })
  }

  // Create
  else {
    if (tags && tags.length > MAX_TAGS_PER_ARTICLE_LIMIT) {
      throw new TooManyTagsForArticleError(
        `Not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
      )
    }
    if (collection && collection.length > MAX_ARTICLES_PER_CONNECTION_LIMIT) {
      throw new ArticleCollectionReachLimitError(
        `Not allow more than ${MAX_ARTICLES_PER_CONNECTION_LIMIT} articles in collection`
      )
    }

    const draft = (await draftService.baseCreate(data)) as Draft & {
      [CACHE_KEYWORD]: Array<{ id: string; type: NODE_TYPES.User }>
    }
    draft[CACHE_KEYWORD] = [
      {
        id: viewer.id,
        type: NODE_TYPES.User,
      },
    ]
    return draft
  }
}

// validators

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
  const _content = normalizeArticleHTML(
    sanitizeHTML(content, { maxHardBreaks: -1, maxSoftBreaks: -1 })
  )
  if (stripHtml(_content).length > MAX_ARTICLE_CONTENT_LENGTH) {
    throw new UserInputError('content reach length limit')
  }
  return _content
}

const validateLicense = (license: string) => {
  // cc_by_nc_nd_2 license not longer in use
  if (license === ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2) {
    throw new UserInputError(
      `${ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2} is not longer in use`
    )
  }
  return license
}

const validateTags = async ({
  viewerId,
  tags,
  dataSources: { atomService },
}: {
  viewerId: string
  tags: string[]
  dataSources: Pick<DataSources, 'atomService'>
}) => {
  // check if tags includes matty's tag
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
  connections,
  atomService,
}: {
  connections: string[]
  atomService: AtomService
}) => {
  await Promise.all(
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
    })
  )
}

const validateCampaigns = async (
  campaigns: Array<{ campaign: string; stage: string }>,
  { draftService }: Pick<DataSources, 'draftService'>
) => {
  const _campaigns = campaigns.map(
    ({ campaign: campaignGlobalId, stage: stageGlobalId }) => {
      const { id: campaignId, type: campaignIdType } =
        fromGlobalId(campaignGlobalId)
      if (campaignIdType !== NODE_TYPES.Campaign) {
        throw new UserInputError('invalid campaign id')
      }
      const { id: stageId, type: stageIdType } = fromGlobalId(stageGlobalId)
      if (stageIdType !== NODE_TYPES.CampaignStage) {
        throw new UserInputError('invalid stage id')
      }

      return { campaign: campaignId, stage: stageId }
    }
  )
  return draftService.validateCampaigns(_campaigns)
}

export default resolver

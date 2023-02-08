import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_STATE,
  ASSET_TYPE,
  CACHE_KEYWORD,
  CIRCLE_STATE,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  NODE_TYPES,
  PUBLISH_STATE,
  USER_STATE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  ArticleNotFoundError,
  AssetNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
  NotAllowAddOfficialTagError,
  TooManyTagsForArticleError,
  UserInputError,
} from 'common/errors'
import {
  extractAssetDataFromHtml,
  fromGlobalId,
  // normalizeTagInput,
  sanitize,
  // stripAllPunct,
} from 'common/utils'
import { ItemData, MutationToPutDraftResolver } from 'definitions'

function sanitizeTags(tags: string[] | null | undefined) {
  if (Array.isArray(tags)) {
    // tags = Array.from(new Set(tags.map(stripAllPunct).filter(Boolean)))
    if (tags.length === 0) {
      return null
    }
  }
  return tags
}

const resolver: MutationToPutDraftResolver = async (
  root,
  { input },
  {
    viewer,
    dataSources: {
      articleService,
      atomService,
      draftService,
      systemService,
      userService,
    },
    knex,
  }
) => {
  const {
    id,
    title,
    summary,
    content,
    // tags,
    cover,
    collection,
    circle: circleGlobalId,
    accessType,
    license,
    requestForDonation,
    replyToDonator,
    iscnPublish,
  } = input
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

  console.log('viewer: ', viewer)
  if (!viewer.likerId) {
    throw new ForbiddenError('user has no liker id')
  }

  const tags = sanitizeTags(input.tags)
  if (Array.isArray(tags) && tags.length > MAX_TAGS_PER_ARTICLE_LIMIT) {
    throw new TooManyTagsForArticleError(
      `not allow more than ${MAX_TAGS_PER_ARTICLE_LIMIT} tags on an article`
    )
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

  // check for collection existence
  // add to dbId array if ok
  let collectionIds // leave as undefined // = null
  if (collection) {
    collectionIds = await Promise.all(
      collection.map(async (articleGlobalId) => {
        if (!articleGlobalId) {
          return
        }

        const { id: articleId } = fromGlobalId(articleGlobalId)
        const article = await articleService.baseFindById(articleId)

        if (!article) {
          throw new ArticleNotFoundError(
            `Cannot find article ${articleGlobalId}`
          )
        }

        if (article.state !== ARTICLE_STATE.active) {
          throw new ForbiddenError(
            `Article ${articleGlobalId} cannot be collected.`
          )
        }

        const isBlocked = await userService.blocked({
          userId: article.authorId,
          targetId: viewer.id,
        })

        if (isBlocked) {
          throw new ForbiddenError('viewer has no permission')
        }

        return articleId
      })
    )

    collectionIds = collectionIds.filter((_id) => !!_id)
  }

  // check circle
  let circleId // leave as undefined // = null
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

  // check if tags includes matty's tag
  const isMatty = viewer.id === environment.mattyId
  const mattyTagId = environment.mattyChoiceTagId
  if (mattyTagId && !isMatty) {
    const mattyTag = await atomService.findUnique({
      table: 'tag',
      where: { id: mattyTagId },
    })
    if (mattyTag && tags?.includes(mattyTag.content)) {
      throw new NotAllowAddOfficialTagError('not allow to add official tag')
    }
  }

  // assemble data
  const resetSummary = summary === null || summary === ''
  const resetCover = cover === null
  const resetCircle = circleGlobalId === null
  const resetCollection =
    collection === null || (collection && collection.length === 0)

  const data: ItemData = _.omitBy(
    {
      authorId: id ? undefined : viewer.id,
      title,
      summary,
      summaryCustomized: summary === undefined ? undefined : !resetSummary,
      content: content && sanitize(content),
      tags, // : input.tags === undefined ? undefined : tags,
      cover: coverId,
      collection: collectionIds,
      circleId,
      access: accessType,
      license, // : license || ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2,
      requestForDonation,
      replyToDonator,
      iscnPublish,
    },
    _.isUndefined // to drop only undefined // _.isNil
  )

  // Update
  if (id) {
    const { id: dbId } = fromGlobalId(id)
    const draft = await draftService.dataloader.load(dbId)

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

    // check for summary length limit
    if (data?.summary?.length > 200) {
      throw new UserInputError('summary reach length limit')
    }

    // handle candidate cover
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
    return draftService.baseUpdate(dbId, {
      ...data,
      // reset fields
      summary: resetSummary ? null : data.summary || draft.summary,
      collection: resetCollection ? null : data.collection || draft.collection,
      // tags: resetTags ? null : data.tags || draft.tags,
      circleId: resetCircle ? null : data.circleId || draft.circleId,
      updatedAt: knex.fn.now(),
    })
  }

  // Create
  else {
    const draft = await draftService.baseCreate({ uuid: v4(), ...data })
    draft[CACHE_KEYWORD] = [
      {
        id: viewer.id,
        type: NODE_TYPES.User,
      },
    ]
    return draft
  }
}

export default resolver

import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_STATE,
  ASSET_TYPE,
  CIRCLE_STATE,
  PUBLISH_STATE,
  USER_STATE,
} from 'common/enums'
import {
  ArticleNotFoundError,
  AssetNotFoundError,
  AuthenticationError,
  CircleNotFoundError,
  DraftNotFoundError,
  ForbiddenByStateError,
  ForbiddenError,
} from 'common/errors'
import { fromGlobalId, sanitize } from 'common/utils'
import { ItemData, MutationToPutDraftResolver } from 'definitions'

const resolver: MutationToPutDraftResolver = async (
  root,
  { input },
  {
    viewer,
    dataSources: { draftService, systemService, articleService, atomService },
  }
) => {
  const {
    id,
    title,
    summary,
    content,
    tags,
    cover,
    collection,
    circle: circleGlobalId,
  } = input

  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (viewer.state === USER_STATE.frozen) {
    throw new ForbiddenByStateError(`${viewer.state} user has no permission`)
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
  let collectionIds = null
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
        } else if (article.state !== ARTICLE_STATE.active) {
          throw new ForbiddenError(
            `Article ${articleGlobalId} cannot be collected.`
          )
        } else {
          return articleId
        }
      })
    )

    collectionIds = collectionIds.filter((_id) => !!_id)
  }

  // check circle
  let circleId = null
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

    circleId = cId
  }

  // assemble data
  const resetSummary = summary === null || summary === ''
  const resetCover = cover === null
  const resetCircle = circleGlobalId === null
  const resetCollection =
    collection === null || (collection && collection.length === 0)
  const resetTags = tags === null || (tags && tags.length === 0)

  const data: ItemData = _.omitBy(
    {
      authorId: id ? undefined : viewer.id,
      title,
      summary,
      summaryCustomized: summary === undefined ? undefined : !resetSummary,
      content: content && sanitize(content),
      tags,
      cover: coverId,
      collection: collectionIds,
      circleId,
    },
    _.isNil
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

    // update
    return draftService.baseUpdate(dbId, {
      ...data,
      updatedAt: new Date(),
      // reset fields
      summary: resetSummary ? null : data.summary || draft.summary,
      cover: resetCover ? null : data.cover || draft.cover,
      collection: resetCollection ? null : data.collection || draft.collection,
      tags: resetTags ? null : data.tags || draft.tags,
      circleId: resetCircle ? null : data.circleId || draft.circleId,
    })
  }

  // Create
  else {
    const draft = await draftService.baseCreate({ uuid: v4(), ...data })
    return draft
  }
}

export default resolver

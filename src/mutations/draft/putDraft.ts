import _ from 'lodash'
import { v4 } from 'uuid'

import { ItemData, MutationToPutDraftResolver } from 'definitions'
import {
  extractAssetDataFromHtml,
  fromGlobalId,
  stripHtml,
  makeSummary,
  sanitize
} from 'common/utils'
import {
  DraftNotFoundError,
  ForbiddenError,
  AssetNotFoundError,
  AuthenticationError,
  ArticleNotFoundError
} from 'common/errors'
import { PUBLISH_STATE, ARTICLE_STATE } from 'common/enums'

const isInvalidAsset = (asset: any, viewer: any) => {
  return !asset || asset.type !== 'embed' || asset.authorId !== viewer.id
}

const resolver: MutationToPutDraftResolver = async (
  root,
  { input },
  { viewer, dataSources: { draftService, systemService, articleService } }
) => {
  const {
    id,
    title,
    content,
    tags,
    coverAssetId: coverAssetUUID,
    collection: collectionGlobalIds
  } = input
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  // check for asset existence
  let coverAssetId
  if (coverAssetUUID) {
    const asset = await systemService.findAssetByUUID(coverAssetUUID)
    if (!asset || asset.type !== 'embed' || asset.authorId !== viewer.id) {
      throw new AssetNotFoundError('Asset does not exists')
    }
    coverAssetId = asset.id
  }

  // check for collection existence
  // add to dbId array if ok
  let collection: string[] = []
  if (collectionGlobalIds && collectionGlobalIds.length > 0) {
    collection = await Promise.all(
      collectionGlobalIds.map(async articleGlobalId => {
        if (!articleGlobalId) {
          throw new ArticleNotFoundError(
            `Cannot find article ${articleGlobalId}`
          )
        }
        const { id: articleId } = fromGlobalId(articleGlobalId)
        const article = await articleService.baseFindById(articleId)
        if (!article) {
          throw new ArticleNotFoundError(
            `Cannot find article ${articleGlobalId}`
          )
        } else if (article.state !== ARTICLE_STATE.active) {
          throw new ForbiddenError(
            `Article ${article.title} cannot be collected.`
          )
        } else {
          return articleId
        }
      })
    )
  }

  // assemble data
  const data: ItemData = _.omitBy(
    {
      authorId: id ? undefined : viewer.id,
      title,
      summary: content && makeSummary(content),
      content: content && sanitize(content),
      tags,
      cover: coverAssetId,
      collection
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
    if (draft.authorId != viewer.id) {
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

    // handle cover
    if (content) {
      const uuids = extractAssetDataFromHtml(content) || []
      // check if cover needs to be removed forcely
      if (uuids.length === 0) {
        data.cover = null
      }

      if (!coverAssetUUID) {
        let coverCandidate
        if (draft.cover && uuids.length > 0) {
          const currentCover = await systemService.baseFindById(
            draft.cover,
            'asset'
          )
          if (!uuids.includes(currentCover.uuid)) {
            coverCandidate = await systemService.findAssetByUUID(uuids[0])
            if (isInvalidAsset(coverCandidate, viewer)) {
              throw new AssetNotFoundError('Asset does not exists')
            }
            data.cover = coverCandidate.id
          }
        }
        if (!draft.cover && uuids.length === 1) {
          coverCandidate = await systemService.findAssetByUUID(uuids[0])
          if (isInvalidAsset(coverCandidate, viewer)) {
            throw new AssetNotFoundError('Asset does not exists')
          }
          data.cover = coverCandidate.id
        }
      }
    }

    // update
    return await draftService.baseUpdate(dbId, {
      updatedAt: new Date(),
      ...data
    })
  }

  // Create
  else {
    const draft = await draftService.baseCreate({ uuid: v4(), ...data })
    return draft
  }
}

export default resolver

import type { ItemData, GQLMutationResolvers } from 'definitions'

// import { FileUpload } from 'graphql-upload'
import { v4 } from 'uuid'

import { IMAGE_ASSET_TYPE, ACCEPTED_UPLOAD_IMAGE_TYPES } from 'common/enums'
import { AssetNotFoundError, UserInputError } from 'common/errors'
import { getLogger } from 'common/logger'
import { fromGlobalId } from 'common/utils'
import { cfsvc } from 'connectors'

const logger = getLogger('mutation-upload')

const resolver: GQLMutationResolvers['directImageUpload'] = async (
  _,
  { input: { type, mime, entityType, entityId, url, draft } },
  { viewer, dataSources: { systemService } }
) => {
  const isImageType = Object.values(IMAGE_ASSET_TYPE).includes(type as any)
  if (!isImageType) {
    throw new UserInputError(`type:${type} doesn't support directImageUpload.`)
  }

  if (mime && !ACCEPTED_UPLOAD_IMAGE_TYPES.includes(mime as any)) {
    throw new UserInputError(`mime:${mime} is not supported.`)
  }

  if (!entityType) {
    throw new UserInputError('Entity type needs to be specified.')
  }

  if (entityType !== 'user' && !entityId) {
    throw new UserInputError('Entity id needs to be specified.')
  }

  const relatedEntityId =
    entityType === 'user' ? viewer.id : fromGlobalId(entityId || '').id
  if (!relatedEntityId) {
    throw new UserInputError('Entity id is incorrect')
  }

  const { id: entityTypeId } = await systemService.baseFindEntityTypeId(
    entityType
  )
  if (!entityTypeId) {
    throw new UserInputError('Entity type is incorrect.')
  }

  let key: string | undefined = undefined

  if (url && draft != null) {
    // if (isImageType) {
    // call cloudflare uploadFileByUrl, handle both direct upload, & any other url upload
    // @ts-ignore
    key = await systemService.cfsvc.baseUploadFileByUrl(type, url)

    const ast = await systemService.findAssetByPath(key)
    if (!(ast?.authorId === viewer.id)) {
      throw new AssetNotFoundError(`Asset by given path does not exists`)
    }
  }

  const uuid = v4()

  let uploadURL: string | undefined = undefined
  if (!key) {
    if (!mime) {
      throw new UserInputError('mime needs to be specified.')
    }
    try {
      // @ts-ignore
      const ext = mime.split('/')[1]
      const result = (await cfsvc.directUploadImage(type, uuid, ext))!
      logger.info('got cloudflare image uploadURL: %o', result)
      ;({ key, uploadURL } = result)
    } catch (err) {
      logger.error('cloudflare upload image ERROR:', err)
      throw err
    }
  }

  const asset: ItemData = {
    uuid,
    authorId: viewer.id,
    type,
    path: key,
    draft: draft != null ? draft : true, // use pass-in draft value or default to true
  }

  const newAsset = await systemService.findAssetOrCreateByPath(
    // createAssetAndAssetMap(
    asset,
    entityTypeId,
    relatedEntityId
  )

  logger.info('return cloudflare image uploadURL: %o', { key, uploadURL })

  return {
    ...newAsset,
    path: systemService.genAssetUrl(newAsset),
    uploadURL,
  }
}

export default resolver

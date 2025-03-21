import type {
  ItemData,
  GQLMutationResolvers,
  GlobalId,
} from '#definitions/index.js'

import {
  IMAGE_ASSET_TYPE,
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
} from '#common/enums/index.js'
import { AssetNotFoundError, UserInputError } from '#common/errors.js'
import { getLogger, auditLog } from '#common/logger.js'
import { fromGlobalId } from '#common/utils/index.js'
import { cfsvc } from '#connectors/index.js'
import { v4 } from 'uuid'

const logger = getLogger('mutation-upload')

const resolver: GQLMutationResolvers['directImageUpload'] = async (
  _,
  { input: { type, mime, entityType, entityId, url, draft } },
  { viewer, dataSources: { systemService } }
) => {
  const isImageType = (Object.values(IMAGE_ASSET_TYPE) as string[]).includes(
    type
  )
  if (!isImageType) {
    throw new UserInputError(`type:${type} doesn't support directImageUpload.`)
  }

  if (
    mime &&
    !(ACCEPTED_UPLOAD_IMAGE_TYPES as readonly string[]).includes(mime)
  ) {
    throw new UserInputError(`mime:${mime} is not supported.`)
  }

  if (!entityType) {
    throw new UserInputError('Entity type needs to be specified.')
  }

  if (entityType !== 'user' && !entityId) {
    throw new UserInputError('Entity id needs to be specified.')
  }

  const relatedEntityId =
    entityType === 'user'
      ? viewer.id
      : fromGlobalId(entityId || ('' as GlobalId)).id
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
    draft: draft != null ? draft : true,
  }

  const newAsset = await systemService.findAssetOrCreateByPath(
    asset,
    entityTypeId,
    relatedEntityId
  )

  logger.info('return cloudflare image uploadURL: %o', { key, uploadURL })

  if (draft === false) {
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.uploadImage,
      status: AUDIT_LOG_STATUS.succeeded,
      entity: 'asset',
      entityId: newAsset.id,
    })
  } else {
    auditLog({
      actorId: viewer.id,
      action: AUDIT_LOG_ACTION.uploadImage,
      status: AUDIT_LOG_STATUS.pending,
      entity: 'asset',
      entityId: newAsset.id,
    })
  }

  return {
    ...newAsset,
    uploadURL,
  }
}

export default resolver

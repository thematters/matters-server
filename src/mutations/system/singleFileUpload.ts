import type { Asset, GQLMutationResolvers } from 'definitions'

import axios from 'axios'
import { FileUpload } from 'graphql-upload'
import { v4 } from 'uuid'

import {
  ACCEPTED_UPLOAD_AUDIO_TYPES,
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  ACCEPTED_COVER_UPLOAD_IMAGE_TYPES,
  AUDIO_ASSET_TYPE,
  IMAGE_ASSET_TYPE,
  COVER_ASSET_TYPE,
  UPLOAD_IMAGE_SIZE_LIMIT,
  UPLOAD_FILE_SIZE_LIMIT,
} from 'common/enums'
import { UnableToUploadFromUrl, UserInputError } from 'common/errors'
import { getLogger } from 'common/logger'
import { fromGlobalId } from 'common/utils'

const logger = getLogger('mutation-upload')

const getFileName = (disposition: string, url: string) => {
  if (disposition) {
    const match = disposition.match(/filename="(.*)"/i) || []
    if (match.length >= 2) {
      return decodeURI(match[1])
    }
  }

  if (url) {
    const fragment = url.split('/').pop()
    if (fragment) {
      return fragment.split('?')[0]
    }
  }
}

const resolver: GQLMutationResolvers['singleFileUpload'] = async (
  _,
  { input: { type, file: fileUpload, url, entityType, entityId } },
  { viewer, dataSources: { systemService } }
) => {
  const isCoverType = Object.values(COVER_ASSET_TYPE).includes(type as any)
  const isImageType = Object.values(IMAGE_ASSET_TYPE).includes(type as any)
  const isAudioType = Object.values(AUDIO_ASSET_TYPE).includes(type as any)

  if ((!fileUpload && !url) || (fileUpload && url)) {
    throw new UserInputError('One of file and url needs to be specified.')
  }

  if (fileUpload && !fileUpload.file) {
    throw new UserInputError('file object is incorrect.')
  }

  if (url && !isImageType) {
    throw new UserInputError(`type:${type} doesn't support specifying a url.`)
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

  let upload
  if (url) {
    try {
      const maxContentLength = isImageType
        ? UPLOAD_IMAGE_SIZE_LIMIT
        : UPLOAD_FILE_SIZE_LIMIT
      const res = await axios.get(url, {
        responseType: 'stream',
        maxContentLength,
      })
      const disposition = res.headers['content-disposition']
      const filename = getFileName(disposition, url)

      upload = {
        createReadStream: () => res.data,
        mimetype: res.headers['content-type'],
        encoding: 'utf8',
        filename,
      }
    } catch (err) {
      throw new UnableToUploadFromUrl(`Unable to upload from url: ${err}`)
    }
  } else {
    const file = fileUpload.file as FileUpload
    upload = await file
  }

  // check MIME types
  if (upload.mimetype) {
    const acceptedImageTypes = isCoverType
      ? ACCEPTED_COVER_UPLOAD_IMAGE_TYPES
      : ACCEPTED_UPLOAD_IMAGE_TYPES
    if (isImageType && !acceptedImageTypes.includes(upload.mimetype)) {
      throw new UserInputError('Invalid image format.')
    }

    if (isAudioType && !ACCEPTED_UPLOAD_AUDIO_TYPES.includes(upload.mimetype)) {
      throw new UserInputError('Invalid audio format.')
    }
  }

  const uuid = v4()
  let key: string
  // make sure both settled
  try {
    key = isImageType
      ? await systemService.cfsvc.baseUploadFile(type, upload, uuid)
      : await systemService.aws.baseUploadFile(type, upload, uuid)
  } catch (err) {
    logger.error('cloudflare upload image ERROR:', err)
    throw err
  }

  // assert both "fulfilled" ?

  const asset: Partial<Asset> = {
    uuid,
    authorId: viewer.id,
    type,
    path: key,
  }

  const newAsset = await systemService.createAssetAndAssetMap(
    asset,
    entityTypeId,
    relatedEntityId
  )

  return {
    ...newAsset,
    path: systemService.genAssetUrl(newAsset),
  }
}

export default resolver

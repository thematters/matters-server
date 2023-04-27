import axios from 'axios'
import { FileUpload } from 'graphql-upload'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ACCEPTED_UPLOAD_AUDIO_TYPES,
  ACCEPTED_UPLOAD_IMAGE_TYPES,
  ASSET_TYPE,
  UPLOAD_IMAGE_SIZE_LIMIT,
} from 'common/enums'
import { UnableToUploadFromUrl, UserInputError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { ItemData, MutationToSingleFileUploadResolver } from 'definitions'

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

const resolver: MutationToSingleFileUploadResolver = async (
  root,
  { input: { type, file: fileUpload, url, entityType, entityId } },
  { viewer, dataSources: { systemService } }
) => {
  const isImageType =
    [
      ASSET_TYPE.avatar,
      ASSET_TYPE.cover,
      ASSET_TYPE.embed,
      ASSET_TYPE.profileCover,
      ASSET_TYPE.oauthClientAvatar,
      ASSET_TYPE.tagCover,
      ASSET_TYPE.circleAvatar,
      ASSET_TYPE.circleCover,
      ASSET_TYPE.topicCover,
    ].indexOf(type) >= 0
  const isAudioType = [ASSET_TYPE.embedaudio].indexOf(type) >= 0

  if ((!fileUpload && !url) || (fileUpload && url)) {
    throw new UserInputError('One of file and url needs to be specified.')
  }

  if (fileUpload && !fileUpload.file) {
    throw new UserInputError('file object is incorrect.')
  }

  if (url && !isImageType) {
    throw new UserInputError(`type:${type} doesn\'t support specifying a url.`)
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
      const res = await axios.get(url, {
        responseType: 'stream',
        maxContentLength: UPLOAD_IMAGE_SIZE_LIMIT,
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
    if (isImageType && !ACCEPTED_UPLOAD_IMAGE_TYPES.includes(upload.mimetype)) {
      throw new UserInputError('Invalid image format.')
    }

    if (isAudioType && !ACCEPTED_UPLOAD_AUDIO_TYPES.includes(upload.mimetype)) {
      throw new UserInputError('Invalid audio format.')
    }
  }

  const uuid = v4()
  // make sure both settled
  const [awsRes, cfsvcRes] = await Promise.allSettled([
    systemService.aws.baseUploadFile(type, upload, uuid),
    isImageType && systemService.cfsvc.baseUploadFile(type, upload, uuid),
  ])

  // assert both "fulfilled" ?
  if (awsRes.status !== 'fulfilled' || cfsvcRes.status !== 'fulfilled') {
    if (awsRes.status !== 'fulfilled') {
      console.error(new Date(), 'aws s3 upload image ERROR:', awsRes.reason)
      throw awsRes.reason
    }
    if (cfsvcRes.status !== 'fulfilled') {
      console.error(
        new Date(),
        'cloudflare upload image ERROR:',
        cfsvcRes.reason
      )
      throw cfsvcRes.reason
    }
  }

  const asset: ItemData = {
    uuid,
    authorId: viewer.id,
    type,
    path: awsRes.value, // key,
  }

  const newAsset = await systemService.createAssetAndAssetMap(
    asset,
    entityTypeId,
    relatedEntityId
  )

  return {
    ...newAsset,
    path: `${systemService.aws.s3Endpoint}/${newAsset.path}`,
  }
}

export default resolver

import * as AWS from 'aws-sdk'
import axios from 'axios'
import getStream from 'get-stream'
import mime from 'mime-types'

import {
  LOCAL_S3_ENDPOINT,
  QUEUE_URL,
  UPLOAD_IMAGE_SIZE_LIMIT,
} from 'common/enums'
import { environment, isLocal, isTest } from 'common/environment'
import { getFileName } from 'common/utils'
import { GQLAssetType } from 'definitions'

export class AWSService {
  s3: AWS.S3
  sqs: AWS.SQS
  sns?: AWS.SNS
  s3Bucket: string
  s3Endpoint: string

  constructor() {
    AWS.config.update(this.getAWSConfig())
    this.s3 = new AWS.S3()
    this.s3Bucket = this.getS3Bucket()
    this.s3Endpoint = this.getS3Endpoint()
    this.sqs = new AWS.SQS()
    if (environment.awsArticlesSnsTopic) {
      this.sns = new AWS.SNS()
    }
  }

  /**
   * Get AWS config.
   */
  getAWSConfig = () => {
    return {
      region: environment.awsRegion,
      accessKeyId: environment.awsAccessId,
      secretAccessKey: environment.awsAccessKey,
      ...(isLocal
        ? { s3BucketEndpoint: true, endpoint: LOCAL_S3_ENDPOINT }
        : {}),
    }
  }

  /**
   * Get S3 endpoint. If AWS Cloud Front is enabled, the default S3 endpoint
   * will be replaced.
   */
  getS3Endpoint = (): string => {
    if (isTest) {
      return `${LOCAL_S3_ENDPOINT}/${this.s3Bucket}`
    } else {
      return `https://${
        environment.awsCloudFrontEndpoint ||
        `${this.s3Bucket}.${environment.awsS3Endpoint}`
      }`
    }
  }

  /**
   * Get S3 bucket.
   */
  getS3Bucket = (): string => {
    return environment.awsS3Bucket
  }

  // check existence
  baseHeadFile = async (
    folder: GQLAssetType,
    upload: any,
    uuid: string
  ): Promise<string> => {
    // the upload stream is read-only once
    // ...
    const key = `${folder}/${uuid}...`
    return key
  }

  // server side fetch and cache an image url
  // throws any axios error
  baseServerSideUploadFile = async (
    folder: GQLAssetType,
    origUrl: string,
    filename?: string
  ): Promise<string | undefined> => {
    // so far, supports OpenSea's caching layer only: https://lh3.googleusercontent...
    const isGoogleContent = origUrl?.match(
      /^https:\/\/([a-z0-9-]+)\.googleusercontent\.com\//
    )
    const isIPFS = origUrl.match(/^https:\/\/ipfs.io\/ipfs\/(?:.*)?$/)
    const isCloudinary = origUrl.match(
      /^https:\/\/res.cloudinary.com\/alchemyapi\/image\/(?:.*)?$/
    )

    if (!isGoogleContent && !isIPFS && !isCloudinary) {
      return
    }
    const origRes = await axios.get(origUrl, {
      responseType: 'stream',
      maxContentLength: UPLOAD_IMAGE_SIZE_LIMIT,
    })

    const disposition = origRes.headers['content-disposition']
    if (!filename) {
      filename = getFileName(disposition, origUrl)
    }

    const upload = {
      createReadStream: () => origRes.data,
      mimetype: origRes.headers['content-type'],
      encoding: 'utf8',
      filename,
    }

    // const uuid = v4()
    const pathname = origUrl.substring(origUrl.lastIndexOf('/') + 1)
    const key = await this.baseUploadFile(
      GQLAssetType.imgCached,
      upload,
      pathname
    )

    return key
  }

  /**
   * Upload file to AWS S3.
   */
  baseUploadFile = async (
    folder: GQLAssetType,
    upload: any,
    uuid: string
  ): Promise<string> => {
    const { createReadStream, mimetype } = upload
    const stream = createReadStream()
    const buffer = await getStream.buffer(stream)

    const extension = mime.extension(mimetype)

    if (!extension) {
      throw new Error('Invalid file type.')
    }

    const key = `${folder}/${uuid}.${extension}`

    // check if already exists
    try {
      const data = await this.s3
        .headObject({
          Bucket: this.s3Bucket,
          Key: key,
        })
        .promise()

      if (
        data.ContentLength === buffer.length &&
        data.ContentType === mimetype
      ) {
        return key
      }
    } catch (err) {
      switch (err.code) {
        case 'NotFound':
          break
        default:
          console.error(new Date(), 'ERROR:', err)
          throw err
      }
    }

    await this.s3
      .upload({
        Body: buffer,
        Bucket: this.s3Bucket,
        ContentType: mimetype,
        Key: key,
      })
      .promise()

    return key
  }

  /**
   * Delete file from AWS S3 by a given path key.
   */
  baseDeleteFile = async (key: string) =>
    this.s3
      .deleteObject({
        Bucket: this.s3Bucket,
        Key: key,
      })
      .promise()

  sqsSendMessage = async ({
    messageBody,
    queueUrl,
    messageGroupId,
    messageDeduplicationId,
  }: {
    messageBody: any
    queueUrl: typeof QUEUE_URL[keyof typeof QUEUE_URL]
    messageGroupId?: string
    messageDeduplicationId?: string
  }) =>
    this.sqs
      ?.sendMessage({
        MessageBody: JSON.stringify(messageBody),
        QueueUrl: queueUrl,
        MessageGroupId: messageGroupId,
        MessageDeduplicationId: messageDeduplicationId,
      })
      .promise()

  snsPublishMessage = async ({
    // MessageGroupId,
    MessageBody,
  }: {
    // MessageGroupId: string
    // Message: any
    MessageBody: any
  }) =>
    this.sns
      ?.publish({
        Message: JSON.stringify({
          default: JSON.stringify(MessageBody),
        }),
        MessageStructure: 'json',
        // MessageGroupId,
        // MessageAttributes: {},
        // MessageDeduplicationId
        // MessageBody: JSON.stringify(MessageBody),
        // QueueUrl: environment.awsIpfsArticlesQueueUrl,
        TopicArn: environment.awsArticlesSnsTopic,
      })
      .promise()
}

export const aws = new AWSService()

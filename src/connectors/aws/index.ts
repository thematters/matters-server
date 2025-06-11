import type { GQLAssetType, ValueOf } from '#definitions/index.js'

import { LOCAL_S3_ENDPOINT, QUEUE_URL } from '#common/enums/index.js'
import { environment, isLocal, isProd, isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import { CloudWatch } from '@aws-sdk/client-cloudwatch'
import { S3 } from '@aws-sdk/client-s3'
import { SQS } from '@aws-sdk/client-sqs'
import { Upload } from '@aws-sdk/lib-storage'
import * as Sentry from '@sentry/node'
import getStream from 'get-stream'
import mime from 'mime-types'

const logger = getLogger('service-aws')

export class AWSService {
  public s3: S3
  public sqs: SQS
  public cloudwatch: CloudWatch
  public s3Bucket: string

  public constructor() {
    const credentials = {
      accessKeyId: environment.awsAccessId,
      secretAccessKey: environment.awsAccessKey,
    }
    this.s3 = new S3({
      credentials,
      region: environment.awsRegion,
      ...(isLocal
        ? { s3BucketEndpoint: true, endpoint: LOCAL_S3_ENDPOINT }
        : {}),
    })
    this.s3Bucket = environment.awsS3Bucket

    this.sqs = new SQS({
      credentials: credentials,
      region: environment.awsRegion,
    })
    this.cloudwatch = new CloudWatch({
      credentials: credentials,
      region: environment.awsRegion,
    })
  }

  /**
   * Get S3 endpoint. If AWS Cloud Front is enabled, the default S3 endpoint
   * will be replaced.
   */
  public getS3Endpoint = (): string =>
    isTest
      ? `${LOCAL_S3_ENDPOINT}/${this.s3Bucket}`
      : `https://${
          environment.awsCloudFrontEndpoint ||
          `${this.s3Bucket}.${environment.awsS3Endpoint}`
        }`

  /**
   * Upload file to AWS S3.
   */
  public baseUploadFile = async (
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
      const data = await this.s3.headObject({
        Bucket: this.s3Bucket,
        Key: key,
      })

      if (
        data.ContentLength === buffer.length &&
        data.ContentType === mimetype
      ) {
        return key
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      Sentry.captureException(err)

      switch (err.name) {
        case 'NotFound':
          break
        default:
          logger.error(err)
          throw err
      }
    }

    await new Upload({
      client: this.s3,

      params: {
        Body: buffer,
        Bucket: this.s3Bucket,
        ContentType: mimetype,
        Key: key,
      },
    }).done()

    return key
  }

  /**
   * Delete file from AWS S3 by a given path key.
   */
  public baseDeleteFile = async (key: string) => {
    logger.info(`Deleting file from S3: ${key}`)
    await this.s3.deleteObject({
      Bucket: this.s3Bucket,
      Key: key,
    })
  }

  public sqsSendMessage = async ({
    messageBody,
    queueUrl,
    messageGroupId,
    messageDeduplicationId,
  }: {
    messageBody: any
    queueUrl: ValueOf<typeof QUEUE_URL>
    messageGroupId?: string
    messageDeduplicationId?: string
  }) => {
    if (isTest) {
      return
    }
    const payload = {
      MessageBody: JSON.stringify(messageBody),
      QueueUrl: queueUrl,
      MessageGroupId: messageGroupId,
      MessageDeduplicationId: messageDeduplicationId,
    }
    const res = await this.sqs?.sendMessage(payload)
    logger.debug(
      'SQS sent message %j with request-id %s',
      payload,
      res?.$metadata?.requestId
    )
  }

  public putMetricData = async ({
    MetricData,
    Namespace = 'MattersDev/Server',
  }: {
    MetricData: any
    Namespace?: string
  }) => {
    if (isTest) {
      return
    }
    if (isProd) {
      Namespace = 'MattersProd/Server'
    }
    const res = (await this.cloudwatch.putMetricData({
      MetricData,
      Namespace,
    })) as any
    logger.debug(
      'cloudwatch:putMetricData %o with res RequestId: %s',
      MetricData,
      res?.$metadata?.requestId
    )
  }
}

export const aws = new AWSService()

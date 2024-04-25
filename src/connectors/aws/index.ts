import type { GQLAssetType, ValueOf } from 'definitions'

import * as AWS from 'aws-sdk'
import getStream from 'get-stream'
import mime from 'mime-types'

import { LOCAL_S3_ENDPOINT, QUEUE_URL } from 'common/enums'
import { environment, isLocal, isProd, isTest } from 'common/environment'
import { getLogger } from 'common/logger'

const logger = getLogger('service-aws')

export class AWSService {
  public s3: AWS.S3
  public sqs: AWS.SQS
  public cloudwatch: AWS.CloudWatch
  public s3Bucket: string
  public s3Endpoint: string

  public constructor() {
    AWS.config.update(this.getAWSConfig())
    this.s3 = new AWS.S3()
    this.s3Bucket = this.getS3Bucket()
    this.s3Endpoint = this.getS3Endpoint()
    this.sqs = new AWS.SQS()
    this.cloudwatch = new AWS.CloudWatch()
  }

  /**
   * Get AWS config.
   */
  private getAWSConfig = () => ({
    region: environment.awsRegion,
    accessKeyId: environment.awsAccessId,
    secretAccessKey: environment.awsAccessKey,
    ...(isLocal ? { s3BucketEndpoint: true, endpoint: LOCAL_S3_ENDPOINT } : {}),
  })

  /**
   * Get S3 endpoint. If AWS Cloud Front is enabled, the default S3 endpoint
   * will be replaced.
   */
  private getS3Endpoint = (): string =>
    isTest
      ? `${LOCAL_S3_ENDPOINT}/${this.s3Bucket}`
      : `https://${
          environment.awsCloudFrontEndpoint ||
          `${this.s3Bucket}.${environment.awsS3Endpoint}`
        }`

  /**
   * Get S3 bucket.
   */
  private getS3Bucket = (): string => environment.awsS3Bucket

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      switch (err.code) {
        case 'NotFound':
          break
        default:
          logger.error(err)
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
  public baseDeleteFile = async (key: string) => {
    logger.info(`Deleting file from S3: ${key}`)
    await this.s3
      .deleteObject({
        Bucket: this.s3Bucket,
        Key: key,
      })
      .promise()
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
    const res = (await this.sqs?.sendMessage(payload).promise()) as any
    logger.debug(
      'SQS sent message %j with request-id %s',
      payload,
      res.ResponseMetadata.RequestId
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
    const res = (await this.cloudwatch
      .putMetricData({ MetricData, Namespace })
      .promise()) as any
    logger.info(
      'cloudwatch:putMetricData %o with res RequestId: %s',
      MetricData,
      res.ResponseMetadata.RequestId
    )
  }
}

export const aws = new AWSService()

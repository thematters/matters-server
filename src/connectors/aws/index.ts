import * as AWS from 'aws-sdk'
import mime from 'mime-types'

import { LOCAL_S3_ENDPOINT } from 'common/enums'
import { environment, isLocal, isTest } from 'common/environment'
import { makeStreamToBuffer } from 'common/utils/makeStreamToBuffer'
import { GQLAssetType } from 'definitions'

export class AWSService {
  s3: AWS.S3
  s3Bucket: string
  s3Endpoint: string

  constructor() {
    AWS.config.update(this.getAWSConfig())
    this.s3 = new AWS.S3()
    this.s3Bucket = this.getS3Bucket()
    this.s3Endpoint = this.getS3Endpoint()
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
    const buffer = await makeStreamToBuffer(stream)

    const extension = mime.extension(mimetype)

    if (!extension) {
      throw new Error('Invalid file type.')
    }

    const key = `${folder}/${uuid}.${extension}`

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

  /**
   * Copy file from AWS S3.
   */
  baseCopyFile = async (source: string, folder: string, uuid: string) => {
    try {
      const file = await this.s3
        .getObject({
          Bucket: this.s3Bucket,
          Key: source,
        })
        .promise()

      if (!file) {
        throw new Error('File not found.')
      }

      const extension = mime.extension(file.ContentType || '')
      if (!extension) {
        throw new Error('Invalid file type.')
      }

      const key = `${folder}/${uuid}.${extension}`

      await this.s3
        .copyObject({
          Bucket: this.s3Bucket,
          CopySource: source,
          Key: key,
        })
        .promise()

      return key
    } catch (error) {
      throw new Error('Could not able to copy file.')
    }
  }
}

export const aws = new AWSService()

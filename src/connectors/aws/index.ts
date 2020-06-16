import * as AWS from 'aws-sdk'
import mime from 'mime-types'

import { LOCAL_S3_ENDPOINT } from 'common/enums'
import { environment } from 'common/environment'
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
    const { env, awsRegion, awsAccessId, awsAccessKey } = environment
    return {
      region: awsRegion || '',
      accessKeyId: awsAccessId || '',
      secretAccessKey: awsAccessKey || '',
      ...(env === 'development'
        ? { s3BucketEndpoint: true, endpoint: LOCAL_S3_ENDPOINT }
        : {}),
    }
  }

  /**
   * Get S3 endpoint. If AWS Cloud Front is enabled, the default S3 endpoint
   * will be replaced.
   */
  getS3Endpoint = (): string => {
    const { env, awsS3Endpoint, awsCloudFrontEndpoint } = environment
    switch (env) {
      case 'staging':
      case 'production': {
        return `https://${
          awsCloudFrontEndpoint || `${this.s3Bucket}.${awsS3Endpoint}`
        }`
      }
      default: {
        return `${LOCAL_S3_ENDPOINT}/${this.s3Bucket}`
      }
    }
  }

  /**
   * Get S3 bucket.
   */
  getS3Bucket = (): string => {
    const { awsS3Bucket } = environment
    return awsS3Bucket || 'matters-server-dev'
  }

  /**
   * Upload file to AWS S3.
   */
  baseUploadFile = async (
    folder: GQLAssetType,
    upload: any,
    uuid: string
  ): Promise<string> => {
    const { createReadStream, mimetype, encoding } = upload
    const stream = createReadStream()
    const buffer = await makeStreamToBuffer(stream)

    const extension =
      mime.extension(mimetype) || upload.filename.split('.').pop()
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
}

export const aws = new AWSService()

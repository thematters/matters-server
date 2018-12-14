// external
import * as AWS from 'aws-sdk'
import { v4 } from 'uuid'
//local
import { S3Bucket, S3Folder } from 'definitions'
import { environment } from 'common/environment'

export class AWSService {
  s3: AWS.S3

  s3Bucket: S3Bucket

  constructor() {
    AWS.config.update(this.getAWSConfig())
    this.s3 = new AWS.S3()
    this.s3Bucket = this.getS3Bucket()
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
    }
  }

  /**
   * Get S3 bucket.
   */
  getS3Bucket = (): S3Bucket => {
    const { env } = environment
    switch (env) {
      case 'staging': {
        return 'matters-server-stage'
      }
      case 'production': {
        return 'matters-server-production'
      }
      default: {
        return 'matters-server-dev'
      }
    }
  }

  /**
   * Upload file to AWS S3.
   */
  baseUploadFile = async (folder: S3Folder, file: any): Promise<string> => {
    const { stream, filename, mimetype, encoding } = file
    const { Location: path } = await this.s3
      .upload({
        Body: stream,
        Bucket: this.s3Bucket,
        ContentEncoding: encoding,
        ContentType: mimetype,
        Key: `${folder}/${v4()}/${filename}`
      })
      .promise()
    return path
  }

  /**
   * Delete file from AWS S3 by a given path key.
   */
  baseDeleteFile = async (key: string): Promise<any> =>
    await this.s3.deleteObject({
      Bucket: this.s3Bucket,
      Key: key
    }).promise()
}

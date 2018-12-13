import * as fs from 'fs'
import * as AWS from 'aws-sdk'
import _ from 'lodash'
import assert from 'assert'
import DataLoader from 'dataloader'
import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
import { v4 } from 'uuid'

import { S3Bucket, S3Folder, ItemData, TableName } from 'definitions'
import { environment } from 'common/environment'
const knexConfig = require('../../knexfile')

export type Item = { id: number; [key: string]: any }

export class BaseService {
  knex: Knex

  idLoader: DataLoader<number, Item>

  uuidLoader: DataLoader<string, Item>

  table: TableName

  s3: AWS.S3

  s3Bucket: S3Bucket

  constructor(table: TableName) {
    this.knex = this.getKnexClient()
    this.table = table
    this.s3 = this.getS3Client()
    this.s3Bucket = this.getS3Bucket()
  }

  /**
   * Initialize a Knex client for PostgreSQL.
   */
  getKnexClient = (): Knex => {
    const { env } = environment
    return Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })
  }

  /**
   * Get S3 Client.
   */
  getS3Client = (): AWS.S3 => {
    const { env, awsRegion, awsAccessId, awsAccessKey } = environment
    AWS.config.update({
      region: awsRegion || '',
      accessKeyId: awsAccessId || '',
      secretAccessKey: awsAccessKey || ''
    })
    return new AWS.S3()
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
   * Find an item by a given id.
   */
  baseFindById = async (id: number): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(this.table)
      .where('id', id)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByIds = async (ids: number[]): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .whereIn('id', ids)

  /**
   * Find an item by a given uuid.
   *
   */
  baseFindByUUID = async (uuid: string): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(this.table)
      .where('uuid', uuid)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByUUIDs = async (uuids: string[]): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .whereIn('uuid', uuids)

  /**
   * Create item
   */
  baseCreate = async (data: ItemData, table?: TableName): Promise<any> =>
    (await this.knex
      .insert(data)
      .into(table || this.table)
      .returning('*'))[0]

  /**
   * Create or Update Item
   * https://github.com/ratson/knex-upsert/blob/master/index.js
   */
  baseUpdateOrCreate = (
    data: ItemData,
    key: string | string[],
    table: TableName
  ) => {
    const keys = _.isString(key) ? [key] : key
    keys.forEach(field =>
      assert(_.has(data, field), `Key "${field}" is missing.`)
    )

    const updateFields = _.keys(_.omit(data, keys))
    const insert = this.knex.table(table).insert(data)
    const keyPlaceholders = new Array(keys.length).fill('??').join(',')

    if (updateFields.length === 0) {
      return this.knex
        .raw(`? ON CONFLICT (${keyPlaceholders}) DO NOTHING RETURNING *`, [
          insert,
          ...keys
        ])
        .then(result => _.get(result, ['rows', 0]))
    }

    const update = this.knex.queryBuilder().update(_.pick(data, updateFields))
    return this.knex
      .raw(`? ON CONFLICT (${keyPlaceholders}) DO ? RETURNING *`, [
        insert,
        ...keys,
        update
      ])
      .then(result => _.get(result, ['rows', 0]))
  }

  /**
   * Update an item by a given id.
   */
  updateById = async (
    id: number,
    data: ItemData,
    table?: TableName
  ): Promise<any> =>
    (await this.knex
      .where('id', id)
      .update(data)
      .into(table || this.table)
      .returning('*'))[0]

  /**
   * Update an item by a given UUID.
   */
  updateByUUID = async (
    uuid: string,
    data: ItemData,
    table?: TableName
  ): Promise<any> =>
    (await this.knex
      .where('uuid', uuid)
      .update(data)
      .into(table || this.table)
      .returning('*'))[0]

  /**
   * Upload file to AWS S3.
   */
  uploadFile = async (folder: S3Folder, file: any): Promise<string> => {
    const { stream, filename, mimetype, encoding } = await file
    const key = `${folder}/${v4()}`
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
}

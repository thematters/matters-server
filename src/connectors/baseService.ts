// external
import { DataSource } from 'apollo-datasource'
import _ from 'lodash'
import assert from 'assert'
import DataLoader from 'dataloader'
import Knex from 'knex'
import { Client as ESClient } from 'elasticsearch'
//local
import { Item, ItemData, TableName } from 'definitions'
import { aws, AWSService } from './aws'
import { knex } from './db'
import { es } from './es'
import logger from 'common/logger'

export class BaseService extends DataSource {
  es: typeof es

  aws: InstanceType<typeof AWSService>

  knex: Knex

  dataloader: DataLoader<string, Item>

  uuidLoader: DataLoader<string, Item>

  table: TableName

  constructor(table: TableName) {
    super()
    this.es = es
    this.knex = knex
    this.table = table
    this.aws = aws
  }

  baseCount = async () => {
    const result = await this.knex(this.table)
      .count()
      .first()

    return parseInt(result.count, 10)
  }

  /**
   * Find an item by a given id.
   */
  baseFindById = async (id: string, table?: TableName): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(table || this.table)
      .where({ id })
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByIds = async (ids: string[], table?: TableName) =>
    await this.knex
      .select()
      .from(table || this.table)
      .whereIn('id', ids)

  /**
   * Find an item by a given uuid.
   *
   */
  baseFindByUUID = async (
    uuid: string,
    table?: TableName
  ): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(table || this.table)
      .where('uuid', uuid)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByUUIDs = async (
    uuids: string[],
    table?: TableName
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from(table || this.table)
      .whereIn('uuid', uuids)

  /**
   * Create item
   */
  baseCreate = async (data: ItemData, table?: TableName): Promise<any> => {
    try {
      const [result] = await this.knex(table || this.table)
        .returning('*')
        .insert(data)
      logger.info(`Inserted id ${result.id} to ${table}`)
      return result
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  /**
   * Create a batch of items
   */
  baseBatchCreate = async (
    dataItems: ItemData[],
    table?: TableName
  ): Promise<any> =>
    await this.knex.batchInsert(table || this.table, dataItems).returning('*')

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
  baseUpdateById = async (
    id: string,
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
  baseUpdateByUUID = async (
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
   * Delete an item by a given id.
   */
  baseDelete = async (id: string, table?: TableName): Promise<any> =>
    await this.knex(table || this.table)
      .where({ id })
      .del()
}

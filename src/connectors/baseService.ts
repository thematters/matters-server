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

  baseCount = async (where: { [key: string]: any } = {}) => {
    const result = await this.knex(this.table)
      .where(where)
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
  baseFindByIds = async (ids: string[], table?: TableName) => {
    let rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('id', ids)

    rows = ids.map(id => rows.find((r: any) => r.id === id))

    return rows
  }

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
  ): Promise<any[]> => {
    let rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('uuid', uuids)

    rows = uuids.map(uuid => rows.find((r: any) => r.uuid === uuid))

    return rows
  }

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
   */
  baseUpdateOrCreate = async ({
    where,
    data,
    table
  }: {
    where: { [key: string]: string | boolean }
    data: ItemData
    table?: TableName
  }) => {
    const tableName = table || this.table
    const item = await this.knex(tableName)
      .select()
      .where(where)
      .first()

    // create
    if (!item) {
      return this.baseCreate(data, tableName)
    }

    // update
    return (await this.knex(tableName)
      .where(where)
      .update(data)
      .returning('*'))[0]
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

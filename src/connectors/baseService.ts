import { DataSource } from 'apollo-datasource'
import DataLoader from 'dataloader'
import Knex from 'knex'
import _ from 'lodash'

import { BATCH_SIZE } from 'common/enums'
import logger from 'common/logger'
import { aws, es, knex } from 'connectors'
import { Item, ItemData, TableName } from 'definitions'

export class BaseService extends DataSource {
  es: typeof es
  aws: typeof aws
  knex: Knex
  dataloader: DataLoader<string, Item>
  table: TableName

  constructor(table: TableName) {
    super()
    this.es = es
    this.knex = knex
    this.table = table
    this.aws = aws
  }

  baseCount = async (where?: { [key: string]: any }, table?: TableName) => {
    let qs = this.knex(table || this.table)
      .count()
      .first()

    if (where) {
      qs = qs.where(where)
    }

    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
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

  baseFindByIds = async (ids: readonly string[], table?: TableName) => {
    let rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('id', ids as string[])

    rows = ids.map((id) => rows.find((r: any) => r.id === id))

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
  baseFindByUUIDs = async (uuids: readonly string[], table?: TableName) => {
    let rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('uuid', uuids as string[])

    rows = uuids.map((uuid) => rows.find((r: any) => r.uuid === uuid))

    return rows
  }

  /**
   * Find items by given "where", "offset" and "limit"
   */
  baseFind = async ({
    where,
    offset = 0,
    limit = BATCH_SIZE,
    table,
  }: {
    where?: { [key: string]: any }
    offset?: number
    limit?: number
    table?: TableName
  }) => {
    let qs = this.knex
      .select()
      .from(table || this.table)
      .orderBy('id', 'desc')

    if (where) {
      qs = qs.where(where)
    }
    if (limit) {
      qs = qs.limit(limit)
    }
    if (offset) {
      qs = qs.offset(offset)
    }

    return qs
  }

  /**
   * Create item
   */
  baseCreate = async (data: ItemData, table?: TableName) => {
    try {
      const [result] = await this.knex(table || this.table)
        .insert(data)
        .returning('*')
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
  baseBatchCreate = async (dataItems: ItemData[], table?: TableName) =>
    this.knex.batchInsert(table || this.table, dataItems).returning('*')

  /**
   * Create or Update Item
   */
  baseUpdateOrCreate = async ({
    where,
    data,
    table,
    createOptions,
  }: {
    where: { [key: string]: any }
    data: ItemData
    table?: TableName
    createOptions?: { [key: string]: any }
  }) => {
    const tableName = table || this.table
    const item = await this.knex(tableName).select().where(where).first()

    // create
    if (!item) {
      let createData = data
      if (createOptions) {
        createData = { ...createData, ...createOptions }
      }
      return this.baseCreate(createData, tableName)
    }

    // update
    const [updatedItem] = await this.knex(tableName)
      .where(where)
      .update(data)
      .returning('*')
    logger.info(`Updated id ${updatedItem.id} in ${tableName}`)
    return updatedItem
  }

  /**
   * Find or Create Item
   */
  baseFindOrCreate = async ({
    where,
    data,
    table,
  }: {
    where: { [key: string]: any }
    data: ItemData
    table?: TableName
  }) => {
    const tableName = table || this.table
    const item = await this.knex(tableName).select().where(where).first()

    // create
    if (!item) {
      return this.baseCreate(data, tableName)
    }

    // find
    return item
  }

  /**
   * Update an item by a given id.
   */
  baseUpdate = async (id: string, data: ItemData, table?: TableName) => {
    const [updatedItem] = await this.knex
      .where('id', id)
      .update(data)
      .into(table || this.table)
      .returning('*')

    logger.info(`Updated id ${id} in ${table || this.table}`)
    return updatedItem
  }
  /**
   * Update a batch of items by given ids.
   */
  baseBatchUpdate = async (ids: string[], data: ItemData, table?: TableName) =>
    this.knex
      .whereIn('id', ids)
      .update(data)
      .into(table || this.table)
      .returning('*')

  /**
   * Delete an item by a given id.
   */
  baseDelete = async (id: string, table?: TableName) =>
    this.knex(table || this.table)
      .where({ id })
      .del()

  /**
   * Delete a batch of items by  given ids.
   */
  baseBatchDelete = async (ids: string[], table?: TableName) =>
    this.knex(table || this.table)
      .whereIn('id', ids)
      .del()

  /**
   * Find entity type id by a given type string.
   */
  baseFindEntityTypeId = async (entityType: string) =>
    this.knex('entity_type').select('id').where({ table: entityType }).first()

  /**
   * Find entity type table by a given id.
   */
  baseFindEntityTypeTable = async (id: string) =>
    this.knex('entity_type').select('table').where({ id }).first()
}

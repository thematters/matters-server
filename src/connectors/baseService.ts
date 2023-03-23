import { DataSource } from 'apollo-datasource'
import DataLoader from 'dataloader'
import { Knex } from 'knex'
import _ from 'lodash'

import logger from 'common/logger.js'
import {
  aws,
  cfsvc,
  es,
  knex,
  meiliClient,
  readonlyKnex,
  searchKnexDB,
} from 'connectors/index.js'
import { Item, ItemData, TableName } from 'definitions'

export class BaseService extends DataSource {
  es: typeof es
  meili: typeof meiliClient
  aws: typeof aws
  cfsvc: typeof cfsvc
  knex: Knex
  knexRO: Knex
  searchKnex: Knex
  dataloader: DataLoader<string, Item>
  table: TableName

  constructor(table: TableName) {
    super()
    this.es = es
    this.meili = meiliClient
    this.knex = knex
    this.knexRO = readonlyKnex
    this.searchKnex = searchKnexDB
    this.table = table
    this.aws = aws
    this.cfsvc = cfsvc
  }

  baseCount = async (where?: { [key: string]: any }, table?: TableName) => {
    const query = this.knex(table || this.table)
      .count()
      .first()

    if (where) {
      query.where(where)
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find an item by a given id.
   */
  baseFindById = async (id: string, table?: TableName): Promise<any | null> =>
    this.knex // .select()
      .from(table || this.table)
      .where({ id })
      .first()

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
    table,
    select = ['*'],
    where,
    orderBy, // = [{ column: 'id', order: 'desc' }],
    skip,
    take,
  }: {
    table?: TableName
    // where?: { [key: string]: any }
    select?: string[]
    where?: Record<string, any>
    orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
    skip?: number
    take?: number
  }) => {
    const query = this.knex.select(select).from(table || this.table)

    if (where) {
      query.where(where)
    }
    if (orderBy) {
      query.orderBy(orderBy)
    }

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /**
   * Create item
   */
  baseCreate = async (
    data: ItemData,
    table?: TableName,
    columns: string[] = ['*'],
    // onConflict?: [ 'ignore' ] | [ 'merge' ],
    modifier?: (builder: Knex.QueryBuilder) => void,
    trx?: Knex.Transaction
  ) => {
    try {
      const query = this.knex(table || this.table)
        .insert(data)
        .returning(columns)
      if (modifier) {
        query.modify(modifier)
      }
      if (trx) {
        query.transacting(trx)
      }
      const [result] = await query
      // logger.info(`Inserted id ${result.id} to ${table || this.table}`)

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
    table?: TableName,
    trx?: Knex.Transaction
  ) => {
    const query = this.knex
      .batchInsert(table || this.table, dataItems)
      .returning('*')
    if (trx) {
      query.transacting(trx)
    }
    return query
  }

  /**
   * Create or Update Item
   */
  baseUpdateOrCreate = async ({
    where,
    data,
    table,
    createOptions,
    updateUpdatedAt,
    trx,
  }: {
    where: { [key: string]: any }
    data: ItemData
    table?: TableName
    createOptions?: { [key: string]: any }
    updateUpdatedAt?: boolean
    trx?: Knex.Transaction
  }) => {
    const tableName = table || this.table
    const item = await this.knex(tableName).select().where(where).first()

    // create
    if (!item) {
      let createData = data
      if (createOptions) {
        createData = { ...createData, ...createOptions }
      }
      return this.baseCreate(createData, tableName, undefined, undefined, trx)
    }

    // update
    const query = this.knex(tableName)
      .where(where)
      .update({
        ...data,
        ...(updateUpdatedAt ? { updatedAt: knex.fn.now() } : null),
      })
      .returning('*')
    // logger.info(`Updated id ${updatedItem.id} in ${tableName}`)
    //
    if (trx) {
      query.transacting(trx)
    }

    const [updatedItem] = await query

    return updatedItem
  }

  /**
   * Find or Create Item
   */
  baseFindOrCreate = async ({
    where,
    data,
    table,
    columns = ['*'],
    modifier,
    skipCreate = false,
    trx,
  }: {
    where: { [key: string]: any }
    data: ItemData
    table?: TableName
    columns?: string[]
    modifier?: (builder: Knex.QueryBuilder) => void
    skipCreate?: boolean
    trx?: Knex.Transaction
  }) => {
    const tableName = table || this.table
    const item = await this.knex(tableName).select(columns).where(where).first()

    // create
    if (!item && !skipCreate) {
      return this.baseCreate(data, tableName, columns, modifier, trx)
    }

    // find
    return item
  }

  /**
   * Update an item by a given id.
   */
  baseUpdate = async (
    id: string,
    data: ItemData,
    table?: TableName,
    trx?: Knex.Transaction
  ) => {
    const query = this.knex
      .where('id', id)
      .update(data)
      .into(table || this.table)
      .returning('*')

    if (trx) {
      query.transacting(trx)
    }
    const [updatedItem] = await query

    // logger.info(`Updated id ${id} in ${table || this.table}`)
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
    this.knexRO('entity_type').select('id').where({ table: entityType }).first()

  /**
   * Find entity type table by a given id.
   */
  baseFindEntityTypeTable = async (id: string) =>
    this.knexRO('entity_type').select('table').where({ id }).first()
}

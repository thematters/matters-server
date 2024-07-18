import type { Connections, BaseDBSchema } from 'definitions'
import type { Redis } from 'ioredis'

import { Knex } from 'knex'

import { getLogger } from 'common/logger'
import { aws, cfsvc } from 'connectors'
import { AtomService, isUpdateableTable } from 'connectors'
import { ItemData, TableName } from 'definitions'

const logger = getLogger('service-base')

export class BaseService<T extends BaseDBSchema> {
  protected table: TableName
  protected connections: Connections
  protected knex: Knex
  protected knexRO: Knex
  protected searchKnex: Knex
  protected redis: Redis
  protected models: AtomService

  public aws: typeof aws
  public cfsvc: typeof cfsvc

  public constructor(table: TableName, connections: Connections) {
    this.table = table
    this.connections = connections
    this.knex = connections.knex
    this.knexRO = connections.knexRO
    this.searchKnex = connections.knexSearch
    this.redis = connections.redis
    this.aws = aws
    this.cfsvc = cfsvc
    this.models = new AtomService(connections)
  }

  /**
   * @deprecated Use `AtomService.count` instead
   */
  public baseCount = async (
    where?: { [key: string]: any },
    table?: TableName
  ) => {
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
   *
   * @deprecated Use `AtomService.findUnique` instead
   */
  public baseFindById = async <S = T>(
    id: string,
    table?: TableName
  ): Promise<S> =>
    this.knex // .select()
      .from(table || this.table)
      .where({ id })
      .first()

  /**
   * Find items by given ids.
   *
   * @deprecated Use `AtomService.findMany` instead
   */
  public baseFindByIds = async <S = T>(
    ids: readonly string[],
    table?: TableName
  ): Promise<S[]> => {
    const rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('id', ids as string[])

    return ids.map((id) => rows.find((r) => r.id === id))
  }

  /**
   * Find an item by a given uuid.
   */
  public baseFindByUUID = async <S = T>(
    uuid: string,
    table?: TableName
  ): Promise<S | null> => {
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
  public baseFindByUUIDs = async <S = T>(
    uuids: readonly string[],
    table?: TableName
  ): Promise<S[]> => {
    const rows = await this.knex
      .select()
      .from(table || this.table)
      .whereIn('uuid', uuids as string[])

    return uuids.map((uuid) => rows.find((r) => r.uuid === uuid))
  }

  /**
   * Find items by given "where", "offset" and "limit"
   *
   * @deprecated Use `AtomService.findMany` instead
   */
  public baseFind = async ({
    table,
    select = ['*'],
    where,
    orderBy, // = [{ column: 'id', order: 'desc' }],
    skip,
    take,
    returnTotalCount,
  }: {
    table?: TableName
    // where?: { [key: string]: any }
    select?: string[]
    where?: Record<string, any>
    orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
    skip?: number
    take?: number
    returnTotalCount?: boolean
  }) => {
    if (returnTotalCount) {
      select.push(
        this.knex.raw('count(1) OVER() AS total_count') as unknown as string
      )
    }

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
   *
   * @privateRemarks
   *
   * `U extends S = S` is used to disable type inference from parameters and make S use T from Class generic when S not provide
   * this idea is from {@link https://github.com/Microsoft/TypeScript/issues/14829#issuecomment-288902999}
   *
   * @deprecated Use `AtomService.create` instead
   */
  public baseCreate = async <S = T, U extends S = S>(
    data: Partial<U>,
    table?: TableName,
    columns: string[] = ['*'],
    modifier?: (builder: Knex.QueryBuilder) => void,
    trx?: Knex.Transaction
  ): Promise<S> => {
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

      return result
    } catch (err) {
      logger.error(err)
      throw err
    }
  }

  /**
   * Create a batch of items
   */
  public baseBatchCreate = async <S = T, U extends S = S>(
    dataItems: Array<Partial<Record<keyof U, any>>>,
    table?: TableName,
    trx?: Knex.Transaction
  ): Promise<S[]> => {
    const query = this.knex
      .batchInsert(table || this.table, dataItems)
      .returning('*')
    if (trx) {
      query.transacting(trx)
    }
    return query as unknown as Promise<S[]>
  }

  /**
   * Create or Update Item
   *
   * @deprecated Use `AtomService.upsert` instead
   */
  public baseUpdateOrCreate = async <S = T>({
    where,
    data,
    table,
    createOptions,
    trx,
  }: {
    where: Partial<S>
    data: Partial<S>
    table?: TableName
    createOptions?: { [key: string]: any }
    trx?: Knex.Transaction
  }): Promise<S> => {
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
      .update(
        isUpdateableTable(tableName)
          ? { ...data, updatedAt: this.knex.fn.now() }
          : data
      )
      .returning('*')

    if (trx) {
      query.transacting(trx)
    }

    const [updatedItem] = await query

    return updatedItem
  }

  /**
   * Find or Create Item
   *
   */
  public baseFindOrCreate = async <S = T, U extends S = S>({
    where,
    data,
    table,
    columns = ['*'],
    modifier,
    skipCreate = false,
    trx,
  }: {
    where: { [key: string]: any }
    data: Partial<U>
    table?: TableName
    columns?: string[]
    modifier?: (builder: Knex.QueryBuilder) => void
    skipCreate?: boolean
    trx?: Knex.Transaction
  }): Promise<S> => {
    const tableName = table || this.table
    const builder = trx ?? this.knex
    const item = await builder(tableName).select(columns).where(where).first()

    // create
    if (!item && !skipCreate) {
      return this.baseCreate(data, tableName, columns, modifier, trx)
    }

    // find
    return item
  }

  /**
   * Update an item by a given id.
   *
   * @deprecated Use `AtomService.update` instead
   */
  public baseUpdate = async <S = T, U extends S = S>(
    id: string,
    data: Partial<U>,
    table?: TableName,
    trx?: Knex.Transaction
  ): Promise<S> => {
    const query = this.knex
      .where('id', id)
      .update(
        isUpdateableTable(table || this.table)
          ? { ...data, updatedAt: this.knex.fn.now() }
          : data
      )
      .into(table || this.table)
      .returning('*')

    if (trx) {
      query.transacting(trx)
    }
    const [updatedItem] = await query

    logger.debug('Updated id %s in %s', id, table ?? this.table)
    return updatedItem
  }
  /**
   * Update a batch of items by given ids.
   *
   * @deprecated Use `AtomService.updateMany` instead
   */
  public baseBatchUpdate = async <S = T>(
    ids: string[],
    data: ItemData,
    table?: TableName
  ): Promise<S[]> =>
    this.knex
      .whereIn('id', ids)
      .update(
        isUpdateableTable(table || this.table)
          ? { ...data, updatedAt: this.knex.fn.now() }
          : data
      )
      .into(table || this.table)
      .returning('*')

  /**
   * Delete an item by a given id.
   *
   */
  public baseDelete = async (id: string, table?: TableName) =>
    this.knex(table || this.table)
      .where({ id })
      .del()

  /**
   * Delete a batch of items by  given ids.
   *
   * @deprecated Use `AtomService.deleteMany` instead
   */
  protected baseBatchDelete = async (ids: string[], table?: TableName) =>
    this.knex(table || this.table)
      .whereIn('id', ids)
      .del()

  /**
   * Find entity type id by a given type string.
   */
  public baseFindEntityTypeId = async (entityType: TableName) =>
    this.knexRO('entity_type').select('id').where({ table: entityType }).first()

  /**
   * Find entity type table by a given id.
   */
  public baseFindEntityTypeTable = async (id: string) =>
    this.knexRO('entity_type').select('table').where({ id }).first()
}

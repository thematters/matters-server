import type { Item, TableName, Connections } from 'definitions'
import type { Knex } from 'knex'

import DataLoader from 'dataloader'

import { EntityNotFoundError } from 'common/errors'
import { aws, cfsvc } from 'connectors'

interface InitLoaderInput {
  table: TableName
  mode: 'id' | 'uuid'
}

interface FindUniqueInput {
  table: TableName
  where: { id: string }
}

interface FindFirstInput {
  table: TableName
  select?: string[]
  where: Record<string, any>
  whereIn?: [string, string[]]
  orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
}

interface FindManyInput {
  table: TableName
  select?: string[]
  where?: Record<string, any>
  whereIn?: [string, string[]]
  orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
  orderByRaw?: string
  modifier?: (builder: Knex.QueryBuilder) => void
  skip?: number
  take?: number
}

interface CreateInput {
  table: TableName
  data: Record<string, any>
}

interface UpdateInput {
  table: TableName
  where: Record<string, any>
  data: Record<string, any>
  columns?: string | string[]
}

interface UpdateJsonColumnInput {
  table: TableName
  where: Record<string, any>
  jsonColumn?: string // default extra column name is 'extra'
  removeKeys?: string[] // keys to remove from extra json column
  jsonData?: Record<string, any> | null
  // resetNull?; boolean
  columns?: string | string[] // returning columns
}

interface UpsertInput {
  table: TableName
  where?: Record<string, any>
  create: Record<string, any>
  update: Record<string, any>
}

interface DeleteManyInput {
  table: TableName
  where?: Record<string, any>
  whereIn?: [string, string[]]
}

interface CountInput {
  table: TableName
  where: Record<string, any>
  whereIn?: [string, string[]]
}

interface MaxInput {
  table: TableName
  where?: Record<string, any>
  column: string
}

/**
 * This object is a container for data loaders or system wide services.
 */
export class AtomService {
  aws: typeof aws
  cfsvc: typeof cfsvc
  knex: Knex

  circleIdLoader: DataLoader<string, Item>
  draftIdLoader: DataLoader<string, Item>
  userIdLoader: DataLoader<string, Item>
  topicIdLoader: DataLoader<string, Item>
  chapterIdLoader: DataLoader<string, Item>

  constructor(connections: Connections) {
    this.aws = aws
    this.cfsvc = cfsvc
    this.knex = connections.knex

    this.circleIdLoader = this.initLoader({ table: 'circle', mode: 'id' })
    this.draftIdLoader = this.initLoader({ table: 'draft', mode: 'id' })
    this.userIdLoader = this.initLoader({ table: 'user', mode: 'id' })
    this.topicIdLoader = this.initLoader({ table: 'topic', mode: 'id' })
    this.chapterIdLoader = this.initLoader({ table: 'chapter', mode: 'id' })
  }

  /* Data Loader */

  /**
   * Initialize typical data loader.
   */
  initLoader = ({ table, mode }: InitLoaderInput) => {
    const batchFn = async (keys: readonly string[]) => {
      let records = await this.findMany({
        table,
        whereIn: [mode, keys as string[]],
      })

      if (records.findIndex((item: any) => !item) >= 0) {
        throw new EntityNotFoundError(`Cannot find entity from ${table}`)
      }

      // fix order based on keys
      records = keys.map((key) => records.find((r: any) => r[mode] === key))

      return records
    }
    return new DataLoader(batchFn)
  }

  /* Basic CRUD */

  /**
   * Find an unique record.
   *
   * A Prisma like method for retrieving a record by specified id.
   */
  findUnique = async ({ table, where }: FindUniqueInput) =>
    this.knex.select().from(table).where(where).first()

  /**
   * Find the first record in rows.
   *
   * A Prisma like method for getting the first record in rows.
   */
  findFirst = async ({ table, where, whereIn, orderBy }: FindFirstInput) => {
    const query = this.knex.select().from(table).where(where)

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (orderBy) {
      query.orderBy(orderBy)
    }

    return query.first()
  }

  /**
   * Find multiple records by given clauses.
   *
   * A Prisma like mehtod for fetching records.
   */
  findMany = async ({
    table,
    select = ['*'],
    where,
    whereIn,
    orderBy,
    orderByRaw,
    modifier,
    skip,
    take,
  }: FindManyInput) => {
    const query = this.knex.select(select).from(table)

    if (where) {
      query.where(where)
    }

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (orderBy) {
      query.orderBy(orderBy)
    }

    if (orderByRaw) {
      query.orderByRaw(orderByRaw)
    }

    if (modifier) {
      query.modify(modifier)
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
   * Create a new record by given data.
   *
   * A Prisma like method for creating one record.
   */
  create = async ({ table, data }: CreateInput) => {
    const [record] = await this.knex(table).insert(data).returning('*')
    return record
  }

  /**
   * Update an unique record.
   *
   * A Prisma like method for updating a record.
   */
  update = async ({ table, where, data, columns = '*' }: UpdateInput) => {
    const [record] = await this.knex
      .where(where)
      .update(data)
      .into(table)
      .returning(columns)
    return record
  }

  updateJsonColumn = async ({
    table,
    where,
    jsonColumn = 'extra', // the json column's name
    removeKeys = [], // the keys to remove from jsonb data
    jsonData, // the extra data to append into jsonb data
    // resetNull,
    columns = '*',
  }: UpdateJsonColumnInput) => {
    const [record] = await this.knex
      .table(table)
      .where(where)
      .update(
        jsonColumn,
        jsonData == null
          ? null
          : this.knex.raw(
              String.raw`(COALESCE(:jsonColumn:, '{}'::jsonb) - :removeKeys ::text[]) || :jsonData ::jsonb`,
              {
                jsonColumn,
                removeKeys,
                jsonData,
              }
            )
      )
      .update('updatedAt', this.knex.fn.now())
      .returning(columns)
    return record
  }

  /**
   * Update many records.
   *
   * A Prisma like method for updating many records.
   */
  updateMany = async ({ table, where, data, columns = '*' }: UpdateInput) =>
    this.knex.where(where).update(data).into(table).returning(columns)

  /**
   * Upsert an unique record.
   *
   * A Prisma like method for updating or creating a record.
   */
  upsert = async ({ table, where, create, update }: UpsertInput) => {
    // TODO: Use onConflict instead
    // @see {@url https://github.com/knex/knex/pull/3763}
    const record = await this.knex(table)
      .select()
      .where(where as Record<string, any>)
      .first()

    // create
    if (!record) {
      return this.knex(table).insert(create).returning('*')
    }

    // update
    const [updatedRecord] = await this.knex(table)
      .where(where as Record<string, any>)
      .update(update)
      .returning('*')

    return updatedRecord
  }

  /**
   * Delete records.
   *
   * A Prisma like method for deleting multiple records.
   */
  deleteMany = async ({ table, where, whereIn }: DeleteManyInput) => {
    const action = this.knex(table)
    if (where) {
      action.where(where as Record<string, any>)
    }
    if (whereIn) {
      action.whereIn(...whereIn)
    }
    await action.del()
  }

  /**
   * Count records.
   *
   * A Prisma like method for counting records.
   */
  count = async ({ table, where, whereIn }: CountInput) => {
    const action = this.knex.count().from(table).where(where)
    if (whereIn) {
      action.whereIn(...whereIn)
    }
    const record = await action.first()

    return parseInt(record ? (record.count as string) : '0', 10)
  }

  /**
   * Max of given column.
   *
   * A Prisma like method for getting max.
   */
  max = async ({ table, where, column }: MaxInput) => {
    const record = await this.knex(table)
      .max(column)
      .where(where as Record<string, any>)
      .first()
    return parseInt(record ? (record.count as string) : '0', 10)
  }
}

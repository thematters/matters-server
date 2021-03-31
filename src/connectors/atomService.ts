import { DataSource } from 'apollo-datasource'
import DataLoader from 'dataloader'
import Knex from 'knex'

import { EntityNotFoundError } from 'common/errors'
import logger from 'common/logger'
import { aws, es, knex } from 'connectors'
import { Item, TableName } from 'definitions'

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
}

interface FindManyInput {
  table: TableName
  select?: string[]
  where?: Record<string, any>
  whereIn?: [string, string[]]
  orderBy?: Array<{ column: string; order: 'asc' | 'desc' }>
  orderByRaw?: string
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
  where?: Record<string, any>
}

/**
 * This object is a container for data loaders or system wide services.
 */
export class AtomService extends DataSource {
  es: typeof es
  aws: typeof aws
  knex: Knex

  circleIdLoader: DataLoader<string, Item>
  draftIdLoader: DataLoader<string, Item>
  userIdLoader: DataLoader<string, Item>

  constructor() {
    super()
    this.es = es
    this.aws = aws
    this.knex = knex

    this.circleIdLoader = this.initLoader({ table: 'circle', mode: 'id' })
    this.draftIdLoader = this.initLoader({ table: 'draft', mode: 'id' })
    this.userIdLoader = this.initLoader({ table: 'user', mode: 'id' })
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
  findFirst = async ({ table, where }: FindFirstInput) =>
    this.knex.select().from(table).where(where).first()

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

    if (skip) {
      query.offset(skip)
    }

    if (take) {
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
  update = async ({ table, where, data }: UpdateInput) => {
    const [record] = await this.knex
      .where(where)
      .update(data)
      .into(table)
      .returning('*')
    return record
  }

  /**
   * Upsert an unique record.
   *
   * A Prisma like method for updating or creating a record.
   */
  upsert = async ({ table, where, create, update }: UpsertInput) => {
    // TODO: Use onConflict instead
    // @see {@url https://github.com/knex/knex/pull/3763}
    const record = await this.knex(table).select().where(where).first()

    // create
    if (!record) {
      return this.knex(table).insert(create).returning('*')
    }

    // update
    const [updatedRecord] = await this.knex(table)
      .where(where)
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
      action.where(where)
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
  count = async ({ table, where }: CountInput) => {
    const query = this.knex.count().from(table)

    if (where) {
      query.where(where)
    }

    const record = await query.first()

    return parseInt(record ? (record.count as string) : '0', 10)
  }

  /* Asset */

  /**
   * Find the url of an asset.
   */
  findAssetUrl = async ({
    where,
  }: {
    where: { id: string }
  }): Promise<string | null> => {
    const record = await this.findUnique({
      table: 'asset',
      where,
    })
    return record && record.path
      ? `${this.aws.s3Endpoint}/${record.path}`
      : null
  }

  /* Elastic Search */

  /**
   * Delete data stored in elastic search.
   */
  deleteSearch = async ({ table, id }: { table: TableName; id: any }) => {
    try {
      const result = await this.es.client.delete({ index: table, id })
      return result
    } catch (error) {
      logger.error(error)
    }
  }
}

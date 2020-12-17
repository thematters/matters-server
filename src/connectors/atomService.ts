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

interface FindInput {
  table: TableName
  where: { id: string }
}

interface UpdateInput {
  table: TableName
  where: { id: string }
  data: Record<string, any>
}

interface DeleteManyInput {
  table: TableName
  where?: Record<string, any>
  whereIn?: [string, string[]]
}

/**
 * This object is a container for data loaders or system wide services.
 */
export class AtomService extends DataSource {
  es: typeof es
  knex: Knex

  constructor() {
    super()
    this.es = es
    this.knex = knex
  }

  /**
   * Find an unique record.
   *
   * A Prisma like method for retrieving a record by specified id.
   */
  findUnique = async ({ table, where }: FindInput) =>
    this.knex.select().from(table).where(where).first()

  /**
   * Update an unique record.
   *
   * A Prisma like method for updating a record by specified id.
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

import { DataSource } from 'apollo-datasource'
import DataLoader from 'dataloader'
import Knex from 'knex'

import { EntityNotFoundError } from 'common/errors'
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

/**
 * This object is a container for data loaders or system wide services.
 */
export class AtomService extends DataSource {
  knex: Knex

  constructor() {
    super()
    this.knex = knex
  }

  /**
   * Find an unique record.
   *
   * A Prisma like query for retrieving a record by specified id.
   */
  findUnique = async ({ table, where }: FindInput) =>
    this.knex.select().from(table).where(where).first()

  /**
   * Update an unique record.
   *
   * A Prisma like operation for updating a record by specified id.
   */
  update = async ({ table, where, data }: UpdateInput) => {
    const [record] = await this.knex
      .where(where)
      .update(data)
      .into(table)
      .returning('*')
    return record
  }
}

import { environment } from '../common/environment'
import Knex from 'knex'
import { tables } from './mockData'

export type Item = { id: string; [key: string]: any }

export type TableName = 'article' | 'user' | 'comment' | 'action'

export class BaseService {

  knex: Knex

  items: Item[]

  table: TableName

  constructor(table: TableName) {
    this.knex = this.getKnexClient()
    this.table = table
    this.items = tables[table]
  }

  /**
   * Initialize a Knex client for PostgreSQL.
   */
  getKnexClient = (): Knex => {
    const { env, pgHost, pgUser, pgPassword, pgDatabase } = environment
    const host = env === 'dev' ? '0.0.0.0' : pgHost
    return Knex({
      client: 'pg',
      connection: {
        host,
        user: pgUser,
        password: pgPassword,
        database: pgDatabase
      }
    })
  }

  /**
   * Find an item by a given id.
   */
  findById = async (id: string): Promise<any | null> => {
    const result = await this.knex.select().from(this.table).where('id', id)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  findByIds = async (ids: string[]): Promise<any[]> => {
    return await this.knex.select().from(this.table).whereIn('id', ids)
  }
}

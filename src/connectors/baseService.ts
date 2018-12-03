import DataLoader from 'dataloader'
import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
import { environment } from '../common/environment'
import { tables } from './mockData'

const knexConfig = require('../../knexfile')

export type Item = { id: string; [key: string]: any }

export type TableName =
  | 'action'
  | 'article'
  | 'comment'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'

export class BaseService {
  knex: Knex

  items: Item[]

  loader: DataLoader<string | number, Item>

  uuidLoader: DataLoader<string, Item>

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
    const { env } = environment
    return Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })
  }

  /**
   * Find items from mock data.
   *
   * @deprecated since version 1.0
   */
  fakeFindByIds = (ids: string[]): Promise<Item[]> =>
    new Promise(resolve =>
      resolve(this.items.filter(({ id: itemId }) => ids.includes(itemId)))
    )

  /**
   * Find an item by a given id.
   */
  baseFindById = async (id: number): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(this.table)
      .where('id', id)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByIds = async (ids: number[]): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .whereIn('id', ids)
  }

  /**
   * Find an item by a given uuid.
   *
   */
  baseFindByUUID = async (uuid: string): Promise<any | null> => {
    const result = await this.knex
      .select()
      .from(this.table)
      .where('uuid', uuid)
    if (result && result.length > 0) {
      return result[0]
    }
    return null
  }

  /**
   * Find items by given ids.
   */
  baseFindByUUIDs = async (uuids: string[]): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .whereIn('uuid', uuids)
  }
}

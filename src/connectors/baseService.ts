import DataLoader from 'dataloader'
import Knex from 'knex'
import { knexSnakeCaseMappers } from 'objection'
import { environment } from '../common/environment'

const knexConfig = require('../../knexfile')

export type Item = { id: number; [key: string]: any }
export type ItemData = { [key: string]: any }

export type TableName =
  | 'action'
  | 'action_user'
  | 'action_comment'
  | 'action_article'
  | 'appreciate'
  | 'article'
  | 'audio_draft'
  | 'comment'
  | 'draft'
  | 'user'
  | 'user_oauth'
  | 'user_notify_setting'

export class BaseService {
  knex: Knex

  idLoader: DataLoader<number, Item>

  uuidLoader: DataLoader<string, Item>

  table: TableName

  constructor(table: TableName) {
    this.knex = this.getKnexClient()
    this.table = table
  }

  /**
   * Initialize a Knex client for PostgreSQL.
   */
  getKnexClient = (): Knex => {
    const { env } = environment
    return Knex({ ...knexConfig[env], ...knexSnakeCaseMappers() })
  }

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
  baseFindByIds = async (ids: number[]): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .whereIn('id', ids)

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
  baseFindByUUIDs = async (uuids: string[]): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .whereIn('uuid', uuids)

  /**
   * Create item
   */
  baseCreate = async (data: ItemData): Promise<any> =>
    (await this.knex
      .insert(data)
      .into(this.table)
      .returning('*'))[0]

  /**
   * Update item
   */
  updateById = async (id: number, data: ItemData): Promise<any> =>
    (await this.knex
      .where('id', id)
      .update(data)
      .into(this.table)
      .returning('*'))[0]

  updateByUUID = async (uuid: string, data: ItemData): Promise<any> =>
    (await this.knex
      .where('uuid', uuid)
      .update(data)
      .into(this.table)
      .returning('*'))[0]
}

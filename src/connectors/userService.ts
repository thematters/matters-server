import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.loader = new DataLoader(this.baseFindByUUIDs)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (email: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('email', email)
  }

  /**
   * Find users by a given user name.
   */
  findByUserName = async (name: string): Promise<any[]> => {
    return await this.knex
      .select()
      .from(this.table)
      .where('user_name', name)
  }

  /**
   * Find user's notify setting by a given user id.
   */
  findNotifySettingByUserId = async (userId: number): Promise<any | null> => {
    const settings = await this.knex
      .select()
      .from('user_notify_setting')
      .where('user_id', userId)
    if (settings && settings.length > 0) {
      return settings[0]
    }
    return null
  }

  /**
   * Find users' notify settings by given ids.
   */
  findNotifySettingByUserIds = async (userIds: number[]): Promise<any[]> => {
    return await this.knex
      .select()
      .from('user_notify_setting')
      .whereIn('user_id', userIds)
  }

  /**
   * Find user's OAuth accounts by a given user id.
   */
  findOAuthByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('user_oauth')
      .where('user_id', userId)
  }

  /**
   * Find user's OAuth accounts by a given user id and type.
   */
  findOAuthByUserIdAndType = async (
    userId: number,
    type: string
  ): Promise<any[]> => {
    return await this.knex
      .select()
      .from('user_oauth')
      .where({
        user_id: userId,
        type: type
      })
  }

  /**
   * Find user's all OAuth types by a given user id.
   */
  findOAuthTypesByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select('type')
      .from('user_oauth')
      .where('user_id', userId)
  }
}

import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.loader = new DataLoader(this.baseFindByUUIDs)
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
   * Find user settings by a given user id
   */

  findSettingByUserId = async (userId: number) => {
    const result = await Promise.all([
      this.findNotifySettingByUserId(userId),
      this.findOAuthByUserId(userId)
    ])
    return { notification: result[0], thirdPartyAccounts: result[1] }
  }

  findNotifySettingByUserId = async (userId: number): Promise<any[]> => {
    const settings = await this.knex
      .select()
      .from('user_notify_setting')
      .where('user_id', userId)
    return settings[0]
  }

  findNotifySettingByUserIds = async (userIds: number[]): Promise<any[]> => {
    return await this.knex
      .select()
      .from('user_notify_setting')
      .whereIn('user_id', userIds)
  }

  /**
   * Find user's OAuth by a given user id.
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
  findByUserIdAndType = async (
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
}

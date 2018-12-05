import { BaseService } from 'src/connectors/baseService'
import { USER_ACTION } from 'src/common/enums'
import DataLoader from 'dataloader'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Count user's following list by a given user id.
   */
  countFollowByUserId = async (userId: number): Promise<any[]> => {
    const result = await this.knex('action_user')
      .countDistinct('id')
      .where({
        user_id: userId,
        action: USER_ACTION.follow
      })
    return result[0].count || 0
  }

  /**
   * Count user's followed list by a given taget id (user).
   */
  countFollowByTargetId = async (targetId: number): Promise<any[]> => {
    const result = await this.knex('action_user')
      .countDistinct('id')
      .where({
        target_id: targetId,
        action: USER_ACTION.follow
      })
    return result[0].count || 0
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

  /**
   * Find user's all appreciation by a given user id.
   */
  findAppreciationByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('appreciate')
      .where('user_id', userId)
  }

  /**
   * Find user's following list by a given user id.
   */
  findFollowByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_user')
      .where({
        user_id: userId,
        action: USER_ACTION.follow
      })
  }

  /**
   * Find user's followed list by a given taget id (user).
   */
  findFollowByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_user')
      .where({
        target_id: targetId,
        action: USER_ACTION.follow
      })
  }

  /**
   * Find an user's rates by a given target id (user).
   */
  findRateByTargetId = async (targetId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_user')
      .where({
        target_id: targetId,
        action: 'rate'
      })
  }

  /**
   * Find an users' subscription by a give user id.
   */
  findSubscriptionByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_article')
      .where('user_id', userId)
  }
}

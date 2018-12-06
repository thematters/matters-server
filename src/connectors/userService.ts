import DataLoader from 'dataloader'
import { hash, compare } from 'bcrypt'
import { v4 } from 'uuid'
import jwt from 'jsonwebtoken'
// local
import { BaseService } from './baseService'
import { BCRYPT_ROUNDS, USER_ACTION } from 'common/enums'
import { environment } from 'common/environment'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.idLoader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /**
   * Create a new user.
   */

  create = async ({
    email,
    userName,
    displayName,
    description,
    avatar,
    password,
    code
  }: {
    [key: string]: string
  }) => {
    // do code validation here
    const passwordHash = await hash(password, BCRYPT_ROUNDS)
    const uuid = v4()
    const qs = await this.knex(this.table)
      .insert({
        uuid,
        email,
        userName,
        displayName,
        description,
        avatar,
        passwordHash,
        oauthType: [],
        language: 'zh_hant',
        status: 'enabled'
      })
      .returning('*')
    return qs[0]
  }

  /**
   * Login user and return jwt token.
   */

  login = async ({ email, password }: { email: string; password: string }) => {
    const user = await this.findByEmail(email)

    if (!user) {
      return {
        auth: false
      }
    }

    const auth = await compare(password, user.passwordHash)
    if (!auth) {
      return {
        auth: false
      }
    }

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn: 86400 * 90 // expires in 24 * 90 hours
    })

    return {
      auth: true,
      token
    }
  }

  /**
   * Count user's following list by a given user id.
   */
  countFollowees = async (userId: number): Promise<number> => {
    const result = await this.knex('action_user')
      .countDistinct('id')
      .where({
        userId,
        action: USER_ACTION.follow
      })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count user's followed list by a given taget id (user).
   */
  countFollowers = async (targetId: number): Promise<number> => {
    const result = await this.knex('action_user')
      .countDistinct('id')
      .where({
        targetId,
        action: USER_ACTION.follow
      })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count an users' subscription by a give user id.
   */
  countSubscriptionByUserId = async (userId: number): Promise<any[]> => {
    const result = await this.knex('action_article')
      .countDistinct('id')
      .where({
        user_id: userId,
        action: USER_ACTION.subscribe
      })
    return result[0].count || 0
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (
    email: string
  ): Promise<{ uuid: string; [key: string]: string }> => {
    return this.knex
      .select()
      .from(this.table)
      .where('email', email)
      .first()
  }

  /**
   * Find users by a given user name.
   */
  findByUserName = async (name: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where('user_name', name)
      .first()

  /**
   * Find user's notify setting by a given user id.
   */
  findNotifySetting = async (userId: number): Promise<any | null> => {
    return await this.knex
      .select()
      .from('user_notify_setting')
      .where('user_id', userId)
      .first()
  }

  /**
   * Find users' notify settings by given ids.
   */
  findNotifySettingByIds = async (userIds: number[]): Promise<any[]> =>
    this.knex
      .select()
      .from('user_notify_setting')
      .whereIn('user_id', userIds)

  /**
   * Find user's OAuth accounts by a given user id.
   */
  findOAuth = async (userId: number): Promise<any> => {
    return await this.knex
      .select()
      .from('user_oauth')
      .where('user_id', userId)
      .first()
  }

  /**
   * Find user's OAuth accounts by a given user id and type.
   */
  findOAuthByType = async (userId: number, type: string): Promise<any> =>
    this.knex
      .select()
      .from('user_oauth')
      .where({
        user_id: userId,
        type: type
      })
      .first()

  /**
   * Find user's all OAuth types by a given user id.
   */
  findOAuthTypes = async (userId: number): Promise<any[]> =>
    await this.knex
      .select('type')
      .from('user_oauth')
      .where('user_id', userId)

  /**
   * Find user's all appreciation by a given user id.
   */
  findAppreciationByUserId = async (userId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('appreciate')
      .where('user_id', userId)

  /**
   * Find user's followeelist by a given user id.
   */
  findFollowees = async (userId: number): Promise<any[]> =>
    this.knex
      .select()
      .from('action_user')
      .where({
        user_id: userId,
        action: USER_ACTION.follow
      })

  /**
   * Find user's follower list by a given taget id (user).
   */
  findFollowers = async (targetId: number): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({
        targetId,
        action: USER_ACTION.follow
      })

  /**
   * Find an user's rates by a given target id (user).
   */
  // findRateByTargetId = async (targetId: number): Promise<any[]> => {
  //   return await this.knex
  //     .select()
  //     .from('action_user')
  //     .where({
  //       target_id: targetId,
  //       action: USER_ACTION.rate
  //     })
  // }

  /**
   * Find an users' subscription by a give user id.
   */
  findSubscriptions = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
  }
}

import DataLoader from 'dataloader'
import { hash, compare } from 'bcrypt'
import { v4 } from 'uuid'
import jwt from 'jsonwebtoken'

import { BATCH_SIZE, BCRYPT_ROUNDS, USER_ACTION } from 'common/enums'
import { environment } from 'common/environment'
import { ItemData } from 'definitions'
import { BaseService } from './baseService'

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
    password,
    code
  }: {
    [key: string]: string
  }) => {
    // TODO: do code validation here

    // TODO: better default unique user name
    if (!userName) {
      userName = email
    }

    // TODO:
    const avatar = 'some-default-s3-url'

    const uuid = v4()
    const passwordHash = await hash(password, BCRYPT_ROUNDS)
    const user = await this.baseCreate({
      uuid,
      email,
      userName,
      displayName,
      description,
      avatar,
      passwordHash
    })
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')
    return await this.idLoader.load(user.id)
  }

  /**
   * Login user and return jwt token.
   */
  login = async ({ email, password }: { email: string; password: string }) => {
    const user = await this.findByEmail(email)

    if (!user) {
      console.log('Cannot find user with email, login failed.')
      return {
        auth: false
      }
    }

    const auth = await compare(password, user.passwordHash)
    if (!auth) {
      console.log('Password incorrect, login failed.')
      return {
        auth: false
      }
    }

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn: 86400 * 90 // expires in 24 * 90 hours
    })

    console.log(`User logged in with uuid ${user.uuid}.`)
    return {
      auth: true,
      token
    }
  }

  /**
   * Count user's following list by a given user id.
   */
  countFollowees = async (userId: string): Promise<number> => {
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
  countFollowers = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_user')
      .countDistinct('id')
      .where({ targetId, action: USER_ACTION.follow })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count an users' subscription by a given user id.
   */
  countSubscription = async (userId: string): Promise<number> => {
    const result = await this.knex('action_article')
      .countDistinct('id')
      .where({ userId, action: USER_ACTION.subscribe })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Count an users' unread notice by a given user id.
   */
  countUnreadNotice = async (userId: string): Promise<number> => {
    const result = await this.knex('notice')
      .countDistinct('id')
      .where({ recipientId: userId, unread: true, deleted: false })
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (
    email: string
  ): Promise<{ uuid: string; [key: string]: string }> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ email })
      .first()

  /**
   * Find users by a given user name.
   */
  findByUserName = async (userName: string): Promise<any[]> =>
    await this.knex
      .select()
      .from(this.table)
      .where({ userName })
      .first()

  /**
   * Find user's notify setting by a given user id.
   */
  findNotifySetting = async (userId: string): Promise<any | null> =>
    await this.knex
      .select()
      .from('user_notify_setting')
      .where({ userId })
      .first()

  /**
   * Find users' notify settings by given ids.
   */
  findNotifySettingByIds = async (userIds: number[]): Promise<any[]> =>
    await this.knex
      .select()
      .from('user_notify_setting')
      .whereIn('user_id', userIds)

  /**
   * Find user's OAuth accounts by a given user id.
   */
  findOAuth = async (userId: string): Promise<any> =>
    await this.knex
      .select()
      .from('user_oauth')
      .where('user_id', userId)
      .first()

  /**
   * Find user's OAuth accounts by a given user id and type.
   */
  findOAuthByType = async (userId: string, type: string): Promise<any> =>
    await this.knex
      .select()
      .from('user_oauth')
      .where({ userId, type })
      .first()

  /**
   * Find user's all OAuth types by a given user id.
   */
  findOAuthTypes = async (userId: string): Promise<any[]> =>
    await this.knex
      .select('type')
      .from('user_oauth')
      .where({ userId })

  /**
   * Find user's all appreciation by a given user id.
   */
  findAppreciationByUserId = async (userId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('appreciate')
      .where({ userId })

  /**
   * Find user's followee list by a given user id.
   */
  findFollowees = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    userId: string
    offset?: number
    limit?: number
  }) =>
    this.knex
      .select()
      .from('action_user')
      .where({ userId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Find user's follower list by a given taget id (user).
   */
  findFollowers = async (targetId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({ targetId, action: USER_ACTION.follow })

  /**
   * Find user's follower list by a given taget id (user) in batches.
   */
  findFollowersInBatch = async (
    targetId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Is user following target
   */
  isFollowing = async ({
    userId,
    targetId
  }: {
    userId: string
    targetId: string
  }): Promise<boolean> => {
    const result = await this.knex
      .select()
      .from('action_user')
      .where({ userId, targetId, action: USER_ACTION.follow })
    return result.length > 0
  }

  /**
   * Find an user's rates by a given target id (user).
   */
  // findRateByTargetId = async (targetId: string): Promise<any[]> => {
  //   return await this.knex
  //     .select()
  //     .from('action_user')
  //     .where({
  //       target_id: targetId,
  //       action: USER_ACTION.rate
  //     })
  // }

  /**
   * Find an users' subscription by a given user id.
   */
  findSubscriptions = async (userId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_article')
      .where({ userId, action: USER_ACTION.subscribe })

  /**
   * Find an users' subscription by a given user id in batches.
   */
  findSubscriptionsInBatch = async (
    userId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> => {
    return await this.knex
      .select()
      .from('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)
  }

  /**
   * Find an users' notices by a given user id in batches.
   */
  findNoticesInBatch = async (
    userId: string,
    offset: number,
    limit = BATCH_SIZE
  ): Promise<any[]> => {
    const notices = await this.knex
      .select()
      .from('notice')
      .where({ recipientId: userId, deleted: false })
      .orderBy('updated_at', 'desc')
      .offset(offset)
      .limit(limit)

    return notices.map(async (notice: any) => {
      // notice detail
      const { noticeType, message, data } = await this.knex
        .select('notice_type', 'message', 'data')
        .from('notice_detail')
        .where({ id: notice.noticeDetailId })
        .first()

      // notice entities
      let entities = await this.knex
        .select()
        .from('notice_entity')
        .where({ noticeId: notice.id })
      entities = entities.map(async ({ type, entityTypeId, entityId }: any) => {
        const { table: entityTableName } = await this.knex
          .select('table')
          .from('entity_type')
          .where({ id: entityTypeId })
          .first()
        const node = await this.knex
          .select()
          .from(entityTableName)
          .where({ id: entityId })
          .first()
        return {
          type,
          node
        }
      })

      // notice actors
      const noticeActorIds = (await this.knex
        .select('actor_id')
        .from('notice_actor')
        .where({ noticeId: notice.id })).map(
        ({ actorId }: { actorId: any }) => actorId
      )
      const actors = await this.knex
        .select()
        .from('user')
        .whereIn('id', noticeActorIds)

      return Object.assign(notice, {
        type: noticeType,
        entities,
        message,
        data,
        actors
      })
    })
  }

  /**
   * Update user_notify_setting by a given user id
   */
  updateNotifySetting = async (
    id: string,
    data: ItemData
  ): Promise<any | null> =>
    await this.baseUpdateById(id, data, 'user_notify_setting')

  /**
   * Follow a user by a given taget id (user).
   */
  follow = async (userId: string, targetId: string): Promise<any[]> =>
    await this.baseUpdateOrCreate(
      {
        userId,
        targetId,
        action: USER_ACTION.follow
      },
      ['userId', 'targetId', 'action'],
      'action_user'
    )

  /**
   * Unfollow a user by a given taget id (user).
   */
  unfollow = async (userId: string, targetId: string): Promise<any[]> =>
    await this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.follow
      })
      .del()
}

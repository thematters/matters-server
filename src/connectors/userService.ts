import DataLoader from 'dataloader'
import { hash, compare } from 'bcrypt'
import { v4 } from 'uuid'
import jwt from 'jsonwebtoken'
import bodybuilder from 'bodybuilder'
import _ from 'lodash'

import logger from 'common/logger'
import {
  BCRYPT_ROUNDS,
  USER_ACTION,
  TRANSACTION_PURPOSE,
  MAT_UNIT,
  VERIFICATION_CODE_EXIPRED_AFTER,
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPES,
  USER_STATE,
  INVITATION_STATUS,
  BATCH_SIZE,
  ARTICLE_STATE,
  USER_ACCESS_TOKEN_EXPIRES_IN,
  BLOCK_USERS
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  PasswordInvalidError,
  ServerError
} from 'common/errors'
import { ItemData, GQLSearchInput, GQLUpdateUserInfoInput } from 'definitions'

import { BaseService } from './baseService'

export class UserService extends BaseService {
  constructor() {
    super('user')
    this.dataloader = new DataLoader(this.baseFindByIds)
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
    password
  }: {
    email: string
    userName: string
    displayName: string
    description?: string
    password: string
  }) => {
    // TODO:
    const avatar = null

    const uuid = v4()
    const passwordHash = await hash(password, BCRYPT_ROUNDS)
    const user = await this.baseCreate({
      uuid,
      email,
      emailVerified: true,
      userName,
      displayName,
      description,
      avatar,
      passwordHash,
      agreeOn: new Date(),
      state: USER_STATE.active
    })
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')

    try {
      await this.addToSearch(user)
    } catch (e) {
      logger.error(e)
    }

    return user
  }

  /**
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  login = async ({ email, password }: { email: string; password: string }) => {
    const user = await this.findByEmail(email)

    if (!user) {
      throw new EmailNotFoundError('Cannot find user with email, login failed.')
    }

    if (BLOCK_USERS.includes(user.userName)) {
      throw new EmailNotFoundError('Cannot find user with email, login failed.')
    }

    const auth = await compare(password, user.passwordHash)
    if (!auth) {
      throw new PasswordInvalidError('Password incorrect, login failed.')
    }

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN
    })

    logger.info(`User logged in with uuid ${user.uuid}.`)
    return {
      token,
      user
    }
  }

  updateInfo = async (
    id: string,
    input: GQLUpdateUserInfoInput & {
      email?: string
      emailVerified?: boolean
      state?: string
    }
  ) => {
    const user = await this.baseUpdate(id, { updatedAt: new Date(), ...input })

    // remove null and undefined, and write into search
    const { description, displayName, userName, state } = input
    if (!(description || displayName || userName || state)) {
      return user
    }
    const searchable = _.omitBy(
      { description, displayName, userName, state },
      _.isNil
    )

    try {
      await this.es.client.update({
        index: this.table,
        type: this.table,
        id,
        body: {
          doc: searchable
        }
      })
    } catch (e) {
      logger.error(e)
    }

    return user
  }

  changePassword = async ({
    userId,
    password
  }: {
    userId: string
    password: string
  }) => {
    const passwordHash = await hash(password, BCRYPT_ROUNDS)
    const user = await this.baseUpdate(userId, {
      passwordHash,
      updatedAt: new Date()
    })
    return user
  }

  /**
   * Find users by a given email.
   */
  findByEmail = async (
    email: string
  ): Promise<{ uuid: string; [key: string]: string }> =>
    this.knex
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
   * Check is username editable
   */
  isUserNameEditable = async (userId: string) => {
    const history = await this.knex('username_edit_history')
      .select()
      .where({ userId })
    return history.length <= 0
  }

  /**
   * Add user name edit history
   */
  addUserNameEditHistory = async ({
    userId,
    previous
  }: {
    userId: string
    previous: string
  }) => await this.baseCreate({ userId, previous }, 'username_edit_history')

  /**
   * Count same user names by a given user name.
   */
  countUserNames = async (userName: string): Promise<number> => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ userName })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/
  /**
   * Dump all data to ES (Currently only used in test)
   */
  initSearch = async () => {
    const users = await this.knex(this.table).select(
      'id',
      'description',
      'display_name',
      'user_name'
    )

    return this.es.indexManyItems({
      index: this.table,
      items: users
    })
  }

  addToSearch = async ({
    id,
    userName,
    displayName,
    description
  }: {
    [key: string]: string
  }) =>
    await this.es.indexItems({
      index: this.table,
      type: this.table,
      items: [
        {
          id,
          userName,
          displayName,
          description
        }
      ]
    })

  search = async ({
    key,
    first = 20,
    offset,
    oss = false
  }: GQLSearchInput & { offset: number; oss?: boolean }) => {
    const body = bodybuilder()
      .from(offset)
      .size(first)
      .query('match', 'displayName', key)
      .filter('term', 'state', USER_STATE.active)
      .build() as { [key: string]: any }

    body.suggest = {
      userName: {
        prefix: key,
        completion: {
          field: 'userName',
          size: first
        }
      },
      displayName: {
        prefix: key,
        completion: {
          field: 'displayName',
          fuzzy: {
            fuzziness: 0
          },
          size: first
        }
      }
    }

    try {
      const result = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })

      const { hits, suggest } = result as (typeof result) & {
        hits: { hits: any[] }
        suggest: { userName: any[]; displayName: any[] }
      }

      let matchIds = hits.hits.map(({ _id }: { _id: any }) => _id)

      let userNameIds = suggest.userName[0].options.map(
        ({ _id }: { _id: any }) => _id
      )
      let displayNameIds = suggest.displayName[0].options.map(
        ({ _id }: { _id: any }) => _id
      )

      // merge two ID arrays and remove duplicates
      let ids = [...new Set([...matchIds, ...displayNameIds, ...userNameIds])]
      const nodes = await this.baseFindByIds(ids)
      return { nodes, totalCount: nodes.length }
    } catch (err) {
      logger.error(err)
      throw new ServerError('search failed')
    }
  }

  findRecentSearches = async (userId: string) => {
    const result = await this.knex('search_history')
      .select('search_key')
      .where({ userId, archived: false })
      .whereNot({ searchKey: '' })
      .max('created_at as search_at')
      .groupBy('search_key')
      .orderBy('search_at', 'desc')
    return result.map(({ searchKey }) => searchKey)
  }

  clearSearches = (userId: string) =>
    this.knex('search_history')
      .where({ userId, archived: false })
      .update({ archived: true })

  /*********************************
   *                               *
   *            MAT                *
   *                               *
   *********************************/
  totalMAT = async (userId: string) => {
    const result = await this.knex('transaction_delta_view')
      .where({
        userId
      })
      .sum('delta as total')
    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  findTransactionHistory = async ({
    id: userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    id: string
    limit?: number
    offset?: number
  }) =>
    await this.knex('transaction_delta_view')
      .where({
        userId
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

  countTransaction = async (id: string) => {
    const result = await this.knex('transaction_delta_view')
      .where({
        userId: id
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *             Follow            *
   *                               *
   *********************************/
  follow = async (userId: string, targetId: string): Promise<any[]> => {
    const data = {
      userId,
      targetId,
      action: USER_ACTION.follow
    }
    return await this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_user'
    })
  }

  unfollow = async (userId: string, targetId: string): Promise<any[]> =>
    await this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.follow
      })
      .del()

  countFollowees = async (userId: string): Promise<number> => {
    const result = await this.knex('action_user')
      .where({
        userId,
        action: USER_ACTION.follow
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countFollowers = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  followeeArticles = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE
  }: {
    userId: string
    offset?: number
    limit?: number
  }) =>
    await this.knex('action_user as au')
      .select('ar.*')
      .join('article as ar', 'ar.author_id', 'au.target_id')
      .where({ action: 'follow', userId, 'ar.state': ARTICLE_STATE.active })
      .orderBy('ar.created_at', 'desc')
      .offset(offset)
      .limit(limit)

  countFolloweeArticles = async (userId: string) => {
    const result = await this.knex('action_user as au')
      .join('article as ar', 'ar.author_id', 'au.target_id')
      .where({ action: 'follow', userId, 'ar.state': ARTICLE_STATE.active })
      .countDistinct('ar.id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findFollowees = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    userId: string
    limit?: number
    offset?: number
  }) =>
    this.knex
      .select()
      .from('action_user')
      .where({ userId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  findFollowers = async ({
    targetId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    targetId: string
    limit?: number
    offset?: number
  }): Promise<any[]> =>
    await this.knex
      .select()
      .from('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

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
      .first()
    return !!result
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/
  recommendAuthor = async ({
    limit = BATCH_SIZE,
    offset = 0,
    notIn = [],
    oss = false
  }: {
    limit?: number
    offset?: number
    notIn?: string[]
    oss?: boolean
  }) => {
    const table = oss ? 'user_reader_view' : 'user_reader_materialized'
    const result = await this.knex(table)
      .select()
      .orderByRaw('author_score DESC NULLS LAST')
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)
      .whereNotIn('id', notIn)
    return result
  }

  findBoost = async (userId: string) => {
    const userBoost = await this.knex('user_boost')
      .select()
      .where({ userId })
      .first()

    if (!userBoost) {
      return 1
    }

    return userBoost.boost
  }

  setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate({
      where: { userId: id },
      data: { userId: id, boost, updatedAt: new Date() },
      table: 'user_boost'
    })

  findScore = async (userId: string) => {
    const author = await this.knex('user_reader_view')
      .select()
      .where({ id: userId })
      .first()
    return author.authorScore || 0
  }

  /*********************************
   *                               *
   *         Notify Setting        *
   *                               *
   *********************************/
  findNotifySetting = async (userId: string): Promise<any | null> =>
    await this.knex
      .select()
      .from('user_notify_setting')
      .where({ userId })
      .first()

  updateNotifySetting = async (
    id: string,
    data: ItemData
  ): Promise<any | null> =>
    await this.baseUpdate(
      id,
      { updatedAt: new Date(), ...data },
      'user_notify_setting'
    )

  findBadges = async (userId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('user_badge')
      .where({ userId })

  /*********************************
   *                               *
   *         Subscription          *
   *                               *
   *********************************/
  countSubscription = async (userId: string) => {
    const result = await this.knex('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findSubscriptions = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    userId: string
    limit?: number
    offset?: number
  }) =>
    this.knex
      .select()
      .from('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')
      .limit(limit)
      .offset(offset)

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  countReadHistory = async (userId: string) => {
    const result = await this.knex('article_read')
      .where({ userId, archived: false })
      .countDistinct('article_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findReadHistory = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    userId: string
    limit?: number
    offset?: number
  }) => {
    const result = await this.knex('article')
      .select('read.read_at', 'article.*')
      .rightJoin(
        this.knex
          .select('read.article_id')
          .max('read.created_at as read_at')
          .from('article_read as read')
          .groupBy('read.article_id')
          .where({ userId, archived: false })
          .as('read'),
        'article.id',
        'read.article_id'
      )
      .where({ state: ARTICLE_STATE.active })
      .orderBy('read_at', 'desc')
      .limit(limit)
      .offset(offset)

    return result.map(({ readAt, ...article }: any) => ({ readAt, article }))
  }

  clearReadHistory = async ({
    articleId,
    userId
  }: {
    articleId: string
    userId: string | null
  }) =>
    await this.knex('article_read')
      .where({ articleId, userId })
      .update({ archived: true })

  /**
   * Activate user
   */
  activate = async ({ id }: { id: string }): Promise<any> => {
    const result = await this.knex(this.table)
      .where({ id })
      .update({ state: USER_STATE.active })
      .returning('*')
    return result[0]
  }

  /*********************************
   *                               *
   *         Verification          *
   *                               *
   *********************************/
  createVerificationCode = ({
    userId,
    email,
    type
  }: {
    userId?: string | null
    email: string
    type: string
  }) =>
    this.baseCreate(
      {
        uuid: v4(),
        userId,
        email,
        type,
        code: _.random(100000, 999999),
        expiredAt: new Date(Date.now() + VERIFICATION_CODE_EXIPRED_AFTER)
      },
      'verification_code'
    )

  findVerificationCodes = async ({
    where
  }: {
    where?: {
      type?: keyof typeof VERIFICATION_CODE_TYPES
      status?: keyof typeof VERIFICATION_CODE_STATUS
      [key: string]: any
    }
  }) => {
    let qs = this.knex
      .select()
      .from('verification_code')
      .orderBy('id', 'desc')

    if (where) {
      qs = qs.where(where)
    }

    return await qs
  }

  markVerificationCodeAs = ({
    codeId,
    status
  }: {
    codeId: string
    status: keyof typeof VERIFICATION_CODE_STATUS
  }) => {
    let data: any = { status }

    if (status === VERIFICATION_CODE_STATUS.used) {
      data = { ...data, usedAt: new Date() }
    } else if (status === VERIFICATION_CODE_STATUS.verified) {
      data = { ...data, verifiedAt: new Date() }
    }

    return this.baseUpdate(
      codeId,
      { updatedAt: new Date(), ...data },
      'verification_code'
    )
  }

  /*********************************
   *                               *
   *         OAuth:LikeCoin        *
   *                               *
   *********************************/
  saveLiker = async ({
    userId,
    likerId,
    accountType,
    accessToken,
    refreshToken,
    expires,
    scope
  }: {
    userId: string
    likerId: string
    accountType: 'temporal' | 'general'
    accessToken: string
    refreshToken?: string
    expires?: number
    scope?: string
  }) => {
    let user = await this.dataloader.load(userId)
    await this.knex
      .select()
      .from('user_oauth_likecoin')
      .where({ likerId: user.likerId })
      .del()
    user = await this.baseUpdate(userId, {
      updatedAt: new Date(),
      likerId
    })

    await this.baseUpdateOrCreate({
      where: { likerId },
      data: {
        updatedAt: new Date(),
        likerId,
        accountType,
        accessToken,
        refreshToken,
        expires,
        scope
      },
      table: 'user_oauth_likecoin'
    })

    return user
  }
}

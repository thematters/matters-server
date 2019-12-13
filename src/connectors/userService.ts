import { compare, hash } from 'bcrypt'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import jwt from 'jsonwebtoken'
import _ from 'lodash'
import { v4 } from 'uuid'

import {
  ARTICLE_STATE,
  BATCH_SIZE,
  BCRYPT_ROUNDS,
  BLOCK_USERS,
  COMMENT_STATE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
  USER_ACTION,
  USER_STATE,
  VERIFICATION_CODE_EXIPRED_AFTER,
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPES,
  MATERIALIZED_VIEW
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  PasswordInvalidError,
  ServerError
} from 'common/errors'
import logger from 'common/logger'
import { BaseService, OAuthService } from 'connectors'
import {
  GQLSearchInput,
  GQLUpdateUserInfoInput,
  ItemData,
  UserOAuthLikeCoin,
  UserOAuthLikeCoinAccountType,
  UserRole,
  UserState
} from 'definitions'

import { likecoin } from './likecoin'

export class UserService extends BaseService {
  likecoin: typeof likecoin

  constructor() {
    super('user')

    this.likecoin = likecoin
    this.dataloader = new DataLoader(this.baseFindByIds)
    this.uuidLoader = new DataLoader(this.baseFindByUUIDs)
  }

  /*********************************
   *                               *
   *            Account            *
   *                               *
   *********************************/
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
      state: USER_STATE.onboarding
    })
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')

    try {
      await this.addToSearch(user)
    } catch (e) {
      logger.error(e)
    }

    return user
  }

  verifyPassword = async ({
    password,
    hash: passwordHash
  }: {
    password: string
    hash: string
  }) => {
    const auth = await compare(password, passwordHash)

    if (!auth) {
      throw new PasswordInvalidError('Password incorrect, login failed.')
    }
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

    await this.verifyPassword({ password, hash: user.passwordHash })

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN_MS / 1000
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
      role?: UserRole
    }
  ) => {
    const user = await this.baseUpdate(id, { updatedAt: new Date(), ...input })

    // remove null and undefined, and write into search
    const { description, displayName, userName, state, role } = input

    if (!(description || displayName || userName || state || role)) {
      return user
    }

    const searchable = _.omitBy(
      { description, displayName, userName, state },
      _.isNil
    )

    try {
      await this.es.client.update({
        index: this.table,
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
  findByUserName = async (userName: string) =>
    this.knex
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
  }) => this.baseCreate({ userId, previous }, 'username_edit_history')

  /**
   * Count same user names by a given user name.
   */
  countUserNames = async (userName: string) => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ userName })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  archive = async (id: string) => {
    return this.knex.transaction(async trx => {
      // archive user
      const [user] = await trx
        .where('id', id)
        .update({
          state: USER_STATE.archived,
          displayName: '已註銷用戶',
          updatedAt: new Date(),
          avatar: null,
          profile_cover: null,
          description: ''
        })
        .into(this.table)
        .returning('*')

      // archive comments, articles and notices
      await trx('article')
        .where({ authorId: id })
        .update({ state: ARTICLE_STATE.archived, updatedAt: new Date() })
      await trx('draft')
        .where({ authorId: id })
        .update({ archived: true, updatedAt: new Date() })
      await trx('comment')
        .where({ authorId: id })
        .update({ state: COMMENT_STATE.archived, updatedAt: new Date() })
      await trx('notice')
        .where({ recipientId: id })
        .update({ deleted: true, updatedAt: new Date() })

      // delete behavioral data
      await trx('search_history')
        .where({ userId: id })
        .del()
      await trx('action_article')
        .where({ userId: id })
        .del()
      await trx('action_user')
        .where({ userId: id })
        .del()
      await trx('article_read')
        .where({ userId: id })
        .del()
      await trx('log_record')
        .where({ userId: id })
        .del()

      // delete oauths
      await trx('oauth_client')
        .where({ userId: id })
        .del()
      await trx('oauth_access_token')
        .where({ userId: id })
        .del()
      await trx('oauth_refresh_token')
        .where({ userId: id })
        .del()

      // delete push devices
      await trx('push_device')
        .where({ userId: id })
        .del()

      return user
    })
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
    this.es.indexItems({
      index: this.table,
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
        body
      })

      const { hits, suggest } = result.body as typeof result & {
        hits: { hits: any[] }
        suggest: { userName: any[]; displayName: any[] }
      }

      const matchIds = hits.hits.map(({ _id }: { _id: any }) => _id)

      const userNameIds = suggest.userName[0].options.map(
        ({ _id }: { _id: any }) => _id
      )
      const displayNameIds = suggest.displayName[0].options.map(
        ({ _id }: { _id: any }) => _id
      )

      // merge two ID arrays and remove duplicates
      const ids = [...new Set([...matchIds, ...displayNameIds, ...userNameIds])]
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
    return result.map(({ searchKey }) =>
      searchKey.slice(0, SEARCH_KEY_TRUNCATE_LENGTH)
    )
  }

  clearSearches = (userId: string) =>
    this.knex('search_history')
      .where({ userId, archived: false })
      .update({ archived: true })

  /*********************************
   *                               *
   *        Transaction            *
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

  totalRecived = async (recipientId: string) => {
    const result = await this.knex('transaction')
      .where({
        recipientId
      })
      .sum('amount as total')

    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  totalRecivedTransactionCount = async (recipientId: string) => {
    const result = await this.knex('transaction')
      .where({
        recipientId
      })
      .count()
    return parseInt(`${result[0].count}` || '0', 10)
  }

  totalSentTransactionCount = async (senderId: string) => {
    const result = await this.knex('transaction')
      .where({
        senderId
      })
      .count()
    return parseInt(`${result[0].count}` || '0', 10)
  }

  totalSent = async (senderId: string) => {
    const result = await this.knex('transaction')
      .where({
        senderId
      })
      .sum('amount as total')
    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  findTransactionBySender = async ({
    senderId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    senderId: string
    limit?: number
    offset?: number
  }) =>
    this.knex('transaction')
      .where({
        senderId
      })
      .limit(limit)
      .offset(offset)
      .orderBy('id', 'desc')

  findTransactionByRecipient = async ({
    recipientId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    recipientId: string
    limit?: number
    offset?: number
  }) =>
    this.knex('transaction')
      .where({
        recipientId
      })
      .limit(limit)
      .offset(offset)
      .orderBy('id', 'desc')

  findTransactionHistory = async ({
    id: userId,
    limit = BATCH_SIZE,
    offset = 0
  }: {
    id: string
    limit?: number
    offset?: number
  }) =>
    this.knex('transaction_delta_view')
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
  follow = async (userId: string, targetId: string) => {
    const data = {
      userId,
      targetId,
      action: USER_ACTION.follow
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_user'
    })
  }

  unfollow = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.follow
      })
      .del()

  countFollowees = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({
        userId,
        action: USER_ACTION.follow
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  countFollowers = async (targetId: string) => {
    const result = await this.knex('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  makeFolloweeWorksQuery = ({
    fields = '*',
    state,
    userId
  }: {
    fields?: string
    state: string
    userId: string
  }) =>
    this.knex.select(fields).from((wrapper: any) => {
      wrapper
        .select(
          this.knex.raw('row_number() over (order by created_at) as seq, *')
        )
        .from((knex: any) => {
          const source = knex.union((operator: any) => {
            operator
              .select(
                this.knex.raw(
                  "'Article' as type, article.id, article.created_at"
                )
              )
              .from('action_user')
              .innerJoin(
                'article',
                'article.author_id',
                'action_user.target_id'
              )
              .where({ userId, state, action: 'follow' })
          })
          source.union((operator: any) => {
            operator
              .select(
                this.knex.raw(
                  "'Comment' as type, max(id) as id, max(created_at) created_at"
                )
              )
              .from(
                this.knex.raw(`
                  (
                    select comment.id, comment.created_at, comment.article_id, comment.author_id
                    from action_user
                    inner join comment on comment.author_id = action_user.target_id
                    where user_id = ${userId} and state = '${state}' and action = 'follow'
                  ) as comment_source
                `)
              )
              .groupBy('article_id', 'author_id')
          })
          source.as('base_sources')
          return source
        })
        .orderBy('created_at', 'desc')
        .as('sources')
    })

  makeFolloweeWorksFilterQuery = ({
    cursorId,
    state,
    userId
  }: {
    cursorId: string
    state: string
    userId: string
  }) => {
    const query = this.makeFolloweeWorksQuery({ fields: 'seq', state, userId })
    return query.where({ id: cursorId }).first()
  }

  findFolloweeWorks = async ({
    after,
    limit = BATCH_SIZE,
    state = USER_STATE.active,
    userId
  }: {
    after?: any
    limit?: number
    state?: string
    userId: string
  }) => {
    const query = this.makeFolloweeWorksQuery({ state, userId })
    if (after) {
      const subQuery = this.makeFolloweeWorksFilterQuery({
        cursorId: after,
        state,
        userId
      })
      query.andWhere('seq', '<', subQuery)
    }
    if (limit) {
      query.limit(limit)
    }
    return query
  }

  findFolloweeWorksRange = async ({
    state = USER_STATE.active,
    userId
  }: {
    state?: string
    userId: string
  }) => {
    const query = this.makeFolloweeWorksQuery({ fields: '', state, userId })
    const { count, max, min } = await query
      .max('seq')
      .min('seq')
      .count()
      .first()
    return {
      count: parseInt(count, 10),
      max: parseInt(max, 10),
      min: parseInt(min, 10)
    }
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
    this.knex('action_user as au')
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
  }) =>
    this.knex
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
  }) => {
    const result = await this.knex
      .select()
      .from('action_user')
      .where({ userId, targetId, action: USER_ACTION.follow })
      .first()
    return !!result
  }

  /*********************************
   *                               *
   *             Block             *
   *                               *
   *********************************/
  block = async (userId: string, targetId: string) => {
    const data = {
      userId,
      targetId,
      action: USER_ACTION.block
    }

    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'action_user'
    })
  }

  unblock = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.block
      })
      .del()

  blocked = async ({
    userId,
    targetId
  }: {
    userId: string
    targetId: string
  }) => {
    const result = await this.knex
      .select()
      .from('action_user')
      .where({ userId, targetId, action: USER_ACTION.block })
      .first()
    return !!result
  }

  countBlockList = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({ userId, action: USER_ACTION.block })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findBlockList = async ({
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
      .where({ userId, action: USER_ACTION.block })
      .orderBy('id', 'desc')
      .offset(offset)
      .limit(limit)

  /*********************************
   *                               *
   *              Push             *
   *                               *
   *********************************/
  subscribePush = async ({
    userId,
    deviceId,
    provider = 'fcm',
    userAgent,
    version,
    platform = 'web'
  }: {
    userId: string
    deviceId: string
    provider?: 'fcm'
    userAgent?: string
    version?: string
    platform?: 'web' | 'ios' | 'android'
  }) => {
    const data = {
      userId,
      deviceId,
      provider,
      userAgent: userAgent || '',
      version: version || '',
      platform: platform || 'web'
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'push_device'
    })
  }

  unsubscribePush = async ({
    userId,
    deviceId
  }: {
    userId: string
    deviceId: string
  }) =>
    this.knex
      .from('push_device')
      .where({
        deviceId,
        userId
      })
      .del()

  findPushDevice = async ({
    userId,
    deviceId
  }: {
    userId: string
    deviceId: string
  }) =>
    this.knex
      .from('push_device')
      .where({
        deviceId,
        userId
      })
      .first()

  findPushDevices = async ({ userIds }: { userIds: string[] }) =>
    this.knex.from('push_device').whereIn('userId', userIds)

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
    const table = oss
      ? 'user_reader_view'
      : MATERIALIZED_VIEW.userReaderMaterialized
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
    this.knex
      .select()
      .from('user_notify_setting')
      .where({ userId })
      .first()

  updateNotifySetting = async (
    id: string,
    data: ItemData
  ): Promise<any | null> =>
    this.baseUpdate(
      id,
      { updatedAt: new Date(), ...data },
      'user_notify_setting'
    )

  findBadges = async (userId: string) =>
    this.knex
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
    this.knex('article_read')
      .where({ articleId, userId })
      .update({ archived: true })

  /**
   * Activate user
   */
  activate = async ({ id }: { id: string }) => {
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

    return qs
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
  findLiker = async ({
    userId,
    likerId
  }: {
    userId?: string
    likerId?: string
  }): Promise<UserOAuthLikeCoin | null> => {
    let userLikerId = likerId
    if (userId) {
      const user = await this.dataloader.load(userId)
      userLikerId = user.likerId
    }

    if (!userLikerId) {
      return null
    }

    return this.knex
      .select()
      .from('user_oauth_likecoin')
      .where({ likerId: userLikerId })
      .first()
  }

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
    accountType: UserOAuthLikeCoinAccountType
    accessToken: string
    refreshToken?: string
    expires?: number
    scope?: string[]
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

  updateLiker = ({
    likerId,
    ...data
  }: {
    likerId: string
    [key: string]: any
  }) => {
    return this.knex
      .select()
      .from('user_oauth_likecoin')
      .where({ likerId })
      .update(data)
  }

  // register a new LikerId by a given userName
  registerLikerId = async ({
    userId,
    userName
  }: {
    userId: string
    userName: string
  }) => {
    // check
    const likerId = await this.likecoin.check({ user: userName })

    // register
    const oAuthService = new OAuthService()
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })
    const { accessToken, refreshToken, scope } = await this.likecoin.register({
      user: likerId,
      token: tokens.accessToken
    })

    // save to db
    return this.saveLiker({
      userId,
      likerId,
      accountType: 'general',
      accessToken,
      refreshToken,
      scope
    })
  }

  // Promote a platform temp LikerID
  claimLikerId = async ({
    userId,
    liker
  }: {
    userId: string
    liker: UserOAuthLikeCoin
  }) => {
    const oAuthService = new OAuthService()
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })

    await this.likecoin.edit({
      action: 'claim',
      payload: { user: liker.likerId, platformToken: tokens.accessToken }
    })

    return this.knex('user_oauth_likecoin')
      .where({ likerId: liker.likerId })
      .update({ accountType: 'general' })
  }

  // Transfer a platform temp LikerID's LIKE and binding to target LikerID
  transferLikerId = async ({
    fromLiker,
    toLiker
  }: {
    fromLiker: UserOAuthLikeCoin
    toLiker: Pick<UserOAuthLikeCoin, 'likerId' | 'accessToken'>
  }) => {
    return this.likecoin.edit({
      action: 'transfer',
      payload: {
        fromUserToken: fromLiker.accessToken,
        toUserToken: toLiker.accessToken
      }
    })
  }

  // Update the platform ID <-> LikerID binding
  bindLikerId = async ({
    userId,
    userToken
  }: {
    userId: string
    userToken: string
  }) => {
    const oAuthService = new OAuthService()
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })

    return this.likecoin.edit({
      action: 'bind',
      payload: {
        platformToken: tokens.accessToken,
        userToken
      }
    })
  }
}

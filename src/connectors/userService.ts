import type {
  UserRestriction,
  Article,
  Item,
  ItemData,
  UserOAuthLikeCoin,
  UserOauthLikecoinDB,
  UserOAuthLikeCoinAccountType,
  UserNotifySetting,
  User,
  ActionUser,
  VerificationCode,
  ValueOf,
  SocialAccount,
  Connections,
  PunishRecord,
  LANGUAGES,
  UserBoost,
} from 'definitions'

import axios from 'axios'
import { compare } from 'bcrypt'
import jwt from 'jsonwebtoken'
import { Knex } from 'knex'
import _, { random } from 'lodash'
import { customAlphabet, nanoid } from 'nanoid'
import { v4 } from 'uuid'
import {
  Hex,
  createPublicClient,
  getContract,
  hashMessage,
  http,
  isAddress,
  recoverMessageAddress,
  trim,
} from 'viem'
import { polygon } from 'viem/chains'

import {
  OFFICIAL_NOTICE_EXTEND_TYPE,
  APPRECIATION_PURPOSE,
  ARTICLE_STATE,
  CACHE_PREFIX,
  CIRCLE_ACTION,
  COMMENT_STATE,
  HOUR,
  MATERIALIZED_VIEW,
  PRICE_STATE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SEARCH_EXCLUDE,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
  USER_ACTION,
  USER_STATE,
  USER_BAN_REMARK,
  AUTHOR_TYPE,
  RESET_PASSWORD_TYPE,
  VERIFICATION_CODE_EXPIRED_AFTER,
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPE,
  USER_RESTRICTION_TYPE,
  VIEW,
  AUTO_FOLLOW_TAGS,
  CIRCLE_STATE,
  DB_NOTICE_TYPE,
  INVITATION_STATE,
  SIGNING_MESSAGE_PURPOSE,
  SOCIAL_LOGIN_TYPE,
  CHANGE_EMAIL_TIMES_LIMIT_PER_DAY,
  CHANGE_EMAIL_COUNTER_KEY_PREFIX,
  AUDIT_LOG_ACTION,
  AUDIT_LOG_STATUS,
  METRICS_NAMES,
  BLOCKCHAIN_RPC,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  CryptoWalletExistsError,
  EthAddressNotFoundError,
  NameInvalidError,
  PasswordInvalidError,
  UserInputError,
  NameExistsError,
  EmailExistsError,
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  ServerError,
  OAuthTokenInvalidError,
  UnknownError,
  ForbiddenError,
  ActionFailedError,
  ForbiddenByStateError,
} from 'common/errors'
import { getLogger, auditLog } from 'common/logger'
import {
  generatePasswordhash,
  isValidUserName,
  isValidPassword,
  makeUserName,
  getPunishExpiredDate,
  IERC1271,
  genDisplayName,
  RatelimitCounter,
  normalizeSearchKey,
} from 'common/utils'
import {
  AtomService,
  BaseService,
  CacheService,
  TagService,
  ipfsServers,
  OAuthService,
  NotificationService,
} from 'connectors'
import { Twitter } from 'connectors/oauth'

import { LikeCoin } from './likecoin'

const logger = getLogger('service-user')

// const SEARCH_DEFAULT_TEXT_RANK_THRESHOLD = 0.0001

export class UserService extends BaseService<User> {
  private ipfs: typeof ipfsServers
  public likecoin: LikeCoin

  public constructor(connections: Connections) {
    super('user', connections)

    this.ipfs = ipfsServers
    this.likecoin = new LikeCoin(connections)
  }

  /*********************************
   *                               *
   *            Account            *
   *                               *
   *********************************/
  public create = async (
    {
      userName,
      displayName,
      password,
      email,
      ethAddress,
      emailVerified = false,
      language,
      referralCode,
    }: {
      userName?: string
      displayName?: string
      password?: string
      email?: string
      ethAddress?: string
      emailVerified?: boolean
      language?: LANGUAGES
      referralCode?: string
    },
    trx?: Knex.Transaction
  ) => {
    const uuid = v4()
    const passwordHash = password
      ? await generatePasswordhash(password)
      : undefined
    const extra = {
      ...(referralCode ? { referralCode } : null),
    }
    const user = await this.baseCreate(
      _.omitBy(
        {
          uuid,
          email,
          emailVerified,
          userName,
          displayName,
          passwordHash,
          agreeOn: new Date(),
          state: USER_STATE.active,
          ethAddress,
          language,
          extra: _.isEmpty(extra) ? null : extra,
        },
        _.isNil
      ),
      'user',
      undefined,
      undefined,
      trx
    )
    await this.baseCreate<UserNotifySetting>(
      { userId: user.id },
      'user_notify_setting',
      undefined,
      undefined,
      trx
    )

    // no await to put data async
    this.aws.putMetricData({
      MetricData: [
        {
          MetricName: METRICS_NAMES.UserRegistrationCount,
          // Counts: [1],
          Dimensions: [
            {
              Name: 'reg_type' /* required */,
              Value: ethAddress ? 'wallet' : 'email' /* required */,
            },
            /* more items */
          ],
          Timestamp: new Date(),
          Unit: 'Count',
          Value: 1,
        },
      ],
    })

    return user
  }

  public postRegister = async (user: User) => {
    const notificationService = new NotificationService(this.connections)
    const atomService = new AtomService(this.connections)
    // auto follow matty
    await this.follow(user.id, environment.mattyId)

    // auto follow tags
    const tagService = new TagService(this.connections)
    await tagService.followTags(user.id, AUTO_FOLLOW_TAGS)

    // send email
    if (user.email && user.displayName) {
      notificationService.mail.sendRegisterSuccess({
        to: user.email,
        recipient: {
          displayName: user.displayName,
        },
        language: user.language,
      })
    }

    // send circle invitations' notices if user is invited
    if (user.email) {
      const invitations = await atomService.findMany({
        table: 'circle_invitation',
        where: { email: user.email, state: INVITATION_STATE.pending },
      })
      await Promise.all(
        invitations.map(async (invitation) => {
          const circle = await atomService.findFirst({
            table: 'circle',
            where: {
              id: invitation.circleId,
              state: CIRCLE_STATE.active,
            },
          })
          notificationService.trigger({
            event: DB_NOTICE_TYPE.circle_invitation,
            actorId: invitation.inviter,
            recipientId: user.id,
            entities: [
              { type: 'target', entityTable: 'circle', entity: circle },
            ],
          })
        })
      )
    }
  }

  public verifyPassword = async ({
    password,
    hash: passwordHash,
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
   * return jwt token. Default to expires in 24 * 90 hours
   */
  public genSessionToken = async (userId: string) => {
    return jwt.sign({ id: userId }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN_MS / 1000,
    })
  }

  /**
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  public loginByEmail = async ({
    email,
    password,
    archivedCallback,
  }: {
    email: string
    password: string
    archivedCallback?: () => Promise<any>
  }) => {
    const user = await this.findByEmail(email)

    if (!user || user.state === USER_STATE.archived) {
      // record agent hash if state is archived
      if (user && user.state === USER_STATE.archived && archivedCallback) {
        await archivedCallback().catch((error) => logger.error(error))
      }
      throw new EmailNotFoundError('Cannot find user with email, login failed.')
    }
    if (!user.passwordHash) {
      throw new PasswordInvalidError('Password incorrect, login failed.')
    }

    await this.verifyPassword({ password, hash: user.passwordHash })

    const token = await this.genSessionToken(user.id)

    logger.info(`User logged in with uuid ${user.uuid}.`)
    return {
      token,
      user,
    }
  }

  /**
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  public loginByEthAddress = async ({
    ethAddress,
    archivedCallback,
  }: {
    ethAddress: string
    archivedCallback?: () => Promise<any>
  }) => {
    const user = await this.findByEthAddress(ethAddress)

    if (!user || user.state === USER_STATE.archived) {
      // record agent hash if state is archived
      if (user && user.state === USER_STATE.archived) {
        if (archivedCallback) {
          await archivedCallback().catch((error) => logger.error(error))
        }
        throw new ForbiddenByStateError('eth address is archived')
      }
      throw new EthAddressNotFoundError(
        'Cannot find user with such ethAddress, login failed.'
      )
    }

    // no password; caller of this has verified eth signature
    // await this.verifyPassword({ password, hash: user.passwordHash })

    const token = await this.genSessionToken(user.id)

    logger.info(
      `User logged in with uuid ${user.uuid} ethAddress ${ethAddress}.`
    )
    return {
      token,
      user,
    }
  }

  public changePassword = async ({
    userId,
    password,
    type = RESET_PASSWORD_TYPE.account,
  }: {
    userId: string
    password: string
    type?: keyof typeof RESET_PASSWORD_TYPE
  }) => {
    const passwordHash = await generatePasswordhash(password)
    const data =
      type === 'payment'
        ? { paymentPasswordHash: passwordHash }
        : { passwordHash }
    const user = await this.baseUpdate(userId, {
      ...data,
    })
    return user
  }

  public findByEmail = async (email: string): Promise<User | undefined> =>
    this.knex.select().from(this.table).where({ email }).first()

  public findByEmails = async (emails: string[]): Promise<User[]> =>
    this.knex.select().from(this.table).whereIn('email', emails)

  public findByUserName = async (
    userName: string,
    ignoreCase = false
  ): Promise<User> =>
    this.knex
      .select()
      .from(this.table)
      .modify((builder: Knex.QueryBuilder) => {
        if (ignoreCase) {
          builder.whereILike('user_name', userName)
        } else {
          builder.where({ userName })
        }
      })
      .first()

  public findByEthAddress = async (ethAddress: string): Promise<User> =>
    this.knex
      .select()
      .from(this.table)
      .where('ethAddress', 'ILIKE', `%${ethAddress}%`) // ethAddress case insensitive
      .first()

  public findByLikerId = async (likerId: string): Promise<User> =>
    this.knex
      .select()
      .from(this.table)
      .where({
        likerId: likerId.toLowerCase(),
      })
      .first()

  public setEmail = async (userId: string, email: string): Promise<User> => {
    const user = await this.models.userIdLoader.load(userId)
    try {
      const res = await this._setEmail(user, email)
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.updateEmail,
        oldValue: user.email,
        newValue: email,
        status: 'succeeded',
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.updateEmail,
        oldValue: user.email,
        newValue: email,
        status: 'failed',
        remark: err.message,
      })
      throw err
    }
  }

  private _setEmail = async (user: User, email: string): Promise<User> => {
    const emailUser = await this.findByEmail(email)
    if (emailUser && emailUser.id !== user.id) {
      if (emailUser.state === USER_STATE.archived) {
        throw new ForbiddenByStateError('email is archived')
      }
      throw new EmailExistsError('email already exists')
    } else if (emailUser && emailUser.id === user.id) {
      return emailUser
    } else {
      const notificationService = new NotificationService(this.connections)
      if (user.email) {
        const counter = new RatelimitCounter(this.redis)
        const count = await counter.increment(
          `${CHANGE_EMAIL_COUNTER_KEY_PREFIX}:${user.id}`
        )
        if (count > CHANGE_EMAIL_TIMES_LIMIT_PER_DAY) {
          throw new ActionFailedError('email change too frequent')
        }
        notificationService.mail.sendEmailChange({
          to: user.email,
          newEmail: email,
          language: user.language,
        })
      }
      return this.baseUpdate(user.id, {
        email,
        emailVerified: false,
        passwordHash: null,
      })
    }
  }

  public changeEmailTimes = async (userId: string) => {
    const counter = new RatelimitCounter(this.redis)
    return counter.get(`${CHANGE_EMAIL_COUNTER_KEY_PREFIX}:${userId}`)
  }

  private _setPassword = async (
    user: Pick<User, 'email' | 'emailVerified' | 'id'>,
    password: string
  ) => {
    if (!isValidPassword(password)) {
      throw new PasswordInvalidError('invalid user password')
    }
    if (!user.email || !user.emailVerified) {
      throw new ForbiddenError('email not verified')
    }
    return await this.baseUpdate(user.id, {
      passwordHash: await generatePasswordhash(password),
    })
  }

  public setPassword = async (
    user: Pick<User, 'email' | 'emailVerified' | 'id'>,
    password: string
  ) => {
    try {
      const res = await this._setPassword(user, password)
      auditLog({
        actorId: user.id,
        action: AUDIT_LOG_ACTION.updatePassword,
        status: 'succeeded',
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: user.id,
        action: AUDIT_LOG_ACTION.updatePassword,
        status: 'failed',
        remark: err.message,
      })
      throw err
    }
  }

  public isUserNameEditable = async (userId: string) => {
    const result = await this.knex('username_edit_history')
      .select()
      .where({ userId })
      .count()
      .first()
    return (Number(result?.count) || 0) <= 0
  }

  public setUserName = async (
    userId: string,
    oldUserName: string,
    userName: string,
    fillDisplayName = true
  ): Promise<User | never> => {
    try {
      const res = await this._setUserName(
        userId,
        oldUserName,
        userName,
        fillDisplayName
      )
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.updateUsername,
        oldValue: oldUserName,
        newValue: userName,
        status: 'succeeded',
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.updateUsername,
        oldValue: oldUserName,
        newValue: userName,
        status: 'failed',
        remark: err.message,
      })
      throw err
    }
  }

  private _setUserName = async (
    userId: string,
    oldUserName: string,
    userName: string,
    fillDisplayName = true
  ): Promise<User> => {
    if (!isValidUserName(userName)) {
      throw new NameInvalidError('invalid user name')
    }

    // allows user to set the same userName
    const isSameUserName = oldUserName.toLowerCase() === userName
    const isUserNameExists = await this.checkUserNameExists(userName)
    if (!isSameUserName && isUserNameExists) {
      throw new NameExistsError('user name already exists')
    }

    let data: Partial<User> = { userName }
    if (fillDisplayName) {
      const user = await this.models.userIdLoader.load(userId)
      data = { ...data, displayName: genDisplayName(user) ?? userName }
    }

    const atomService = new AtomService(this.connections)
    await atomService.create({
      table: 'username_edit_history',
      data: {
        userId: userId,
        previous: oldUserName,
      },
    })
    return await this.baseUpdate(userId, data)
  }

  /**
   * Check if user name (case insensitive) exists.
   */
  public checkUserNameExists = async (userName: string) => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('userName', 'ILIKE', userName)
      .first()

    const count = parseInt(result ? (result.count as string) : '0', 10)
    return count > 0
  }

  /**
   * Programatically generate user name
   */
  public generateUserName = async (email: string) => {
    let retries = 0
    const mainName = makeUserName(email)
    let userName = mainName
    while (
      !isValidUserName(userName) ||
      (await this.checkUserNameExists(userName))
    ) {
      if (retries >= 20) {
        throw new NameInvalidError('cannot generate user name')
      }
      userName = `${mainName}${random(1, 999)}`
      retries += 1
    }

    return userName
  }

  public archive = async (id: string) => {
    const archivedUser = await this.knex.transaction(async (trx) => {
      // archive user
      const [user] = await trx
        .where('id', id)
        .update({
          state: USER_STATE.archived,
          displayName: '已註銷用戶',
          updatedAt: new Date(),
          avatar: null,
          profile_cover: null,
          description: '',
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
      await trx('search_history').where({ userId: id }).del()
      await trx('action_article').where({ userId: id }).del()
      await trx('action_user').where({ userId: id }).del()
      await trx('article_read_count').where({ userId: id }).del()
      await trx('log_record').where({ userId: id }).del()

      // delete oauths
      await trx('oauth_client').where({ userId: id }).del()
      await trx('oauth_access_token').where({ userId: id }).del()
      await trx('oauth_refresh_token').where({ userId: id }).del()

      // delete push devices
      await trx('push_device').where({ userId: id }).del()

      // remove tag owner and editors
      await trx.raw(`
        UPDATE
          tag
        SET
          owner = NULL,
          editors = array_remove(editors, owner::text)
        WHERE
          owner = ${id}
      `)

      return user
    })

    return archivedUser
  }

  /*********************************
   *                               *
   *           Search              *
   *                               *
   *********************************/

  public search = async ({
    key: keyOriginal,
    take,
    skip,
    exclude,
    viewerId,
    coefficients,
    quicksearch,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
    const key = await normalizeSearchKey(keyOriginal)
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      logger.error(err)
    }

    const c0 = +(coeffs?.[0] || environment.searchPgUserCoefficients?.[0] || 1)
    const c1 = +(coeffs?.[1] || environment.searchPgUserCoefficients?.[1] || 1)
    const c2 = +(coeffs?.[2] || environment.searchPgUserCoefficients?.[2] || 1)
    const c3 = +(coeffs?.[3] || environment.searchPgUserCoefficients?.[3] || 1)
    const c4 = +(coeffs?.[4] || environment.searchPgUserCoefficients?.[4] || 1)
    const c5 = +(coeffs?.[5] || environment.searchPgUserCoefficients?.[5] || 1)
    const c6 = +(coeffs?.[6] || environment.searchPgUserCoefficients?.[6] || 1)

    const searchUserName = key.startsWith('@') || key.startsWith('＠')
    const strippedName = key.replaceAll(/^[@＠]+/g, '').trim()

    if (!strippedName) {
      return { nodes: [], totalCount: 0 }
    }

    // gather users that blocked viewer
    const excludeBlocked = exclude === SEARCH_EXCLUDE.blocked && viewerId
    let blockedIds: string[] = []
    if (excludeBlocked) {
      blockedIds = (
        await this.knex('action_user')
          .select('user_id')
          .where({ action: USER_ACTION.block, targetId: viewerId })
      ).map(({ userId }) => userId)
    }

    const baseQuery = this.searchKnex
      .select(
        '*',

        this.searchKnex.raw(
          'percent_rank() OVER (ORDER BY num_followers NULLS FIRST) AS followers_rank'
        ),
        this.searchKnex.raw(
          '(CASE WHEN user_name = ? THEN 1 ELSE 0 END) ::float AS user_name_equal_rank',
          [strippedName]
        ),
        this.searchKnex.raw(
          '(CASE WHEN display_name = ? THEN 1 ELSE 0 END) ::float AS display_name_equal_rank',
          [strippedName]
        ),
        this.searchKnex.raw(
          '(CASE WHEN user_name LIKE ? THEN 1 ELSE 0 END) ::float AS user_name_like_rank',
          [`%${strippedName}%`]
        ),
        this.searchKnex.raw(
          '(CASE WHEN display_name LIKE ? THEN 1 ELSE 0 END) ::float AS display_name_like_rank',
          [`%${strippedName}%`]
        ),
        this.searchKnex.raw(
          'ts_rank(display_name_jieba_ts, query) AS display_name_ts_rank'
        ),
        this.searchKnex.raw(
          'ts_rank(description_jieba_ts, query) AS description_ts_rank'
        )
      )
      .from('search_index.user')
      .crossJoin(
        this.searchKnex.raw(`plainto_tsquery('jiebacfg', ?) query`, key)
      )
      .where('state', 'NOT IN', [
        // USER_STATE.active,
        USER_STATE.archived,
        USER_STATE.banned,
      ])
      .andWhere('id', 'NOT IN', blockedIds)
      .andWhere((builder: Knex.QueryBuilder) => {
        builder
          .whereLike('user_name', `%${strippedName}%`)
          .orWhereLike('display_name', `%${strippedName}%`)

        if (!quicksearch) {
          builder
            .orWhereRaw('display_name_jieba_ts @@ query')
            .orWhereRaw('description_jieba_ts @@ query')
        }
      })

    const queryUsers = this.searchKnex
      .select(
        '*',
        this.searchKnex.raw(
          '(? * followers_rank + ? * user_name_equal_rank + ? * display_name_equal_rank + ? * user_name_like_rank + ? * display_name_like_rank + ? * display_name_ts_rank + ? * description_ts_rank) AS score',
          [c0, c1, c2, c3, c4, c5, c6]
        ),
        this.searchKnex.raw('COUNT(id) OVER() ::int AS total_count')
      )
      .from(baseQuery.as('base'))
      .modify((builder: Knex.QueryBuilder) => {
        if (quicksearch) {
          if (searchUserName) {
            builder
              .orderByRaw('user_name = ? DESC', [strippedName])
              .orderByRaw('display_name = ? DESC', [strippedName])
          } else {
            builder
              .orderByRaw('display_name = ? DESC', [strippedName])
              .orderByRaw('user_name = ? DESC', [strippedName])
          }
        } else {
          builder.orderByRaw('score DESC NULLS LAST')
        }
      })
      .orderByRaw('num_followers DESC NULLS LAST')
      .orderByRaw('id') // fallback to earlier first
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    const records = (await queryUsers) as Item[]
    const totalCount = records.length === 0 ? 0 : +records[0].totalCount

    logger.debug(
      `userService::searchV2 searchKnex instance got ${records.length} nodes from: ${totalCount} total:`,
      { key, keyOriginal, queryUsers: queryUsers.toString() },
      { sample: records?.slice(0, 3) }
    )

    const nodes = (await this.models.userIdLoader.loadMany(
      records.map(({ id }) => id)
    )) as Item[]

    return { nodes, totalCount }
  }

  public searchV3 = async ({
    key: keyOriginal,
    take,
    skip,
    quicksearch,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
    const key = await normalizeSearchKey(keyOriginal)
    try {
      const u = new URL(`${environment.tsQiServerUrl}/api/users/search`)
      u.searchParams.set('q', key?.trim())
      if (quicksearch) {
        u.searchParams.set('quicksearch', '1')
      }
      if (take) {
        u.searchParams.set('limit', `${take}`)
      }
      if (skip) {
        u.searchParams.set('offset', `${skip}`)
      }
      logger.info(`searchV3 fetching from: "%s"`, u.toString())
      const {
        nodes: records,
        total: totalCount,
        query,
      } = await fetch(u).then((res) => res.json())
      logger.info(
        `searchV3 found ${records?.length}/${totalCount} results from tsquery: '${query}': sample: %j`,
        records[0]
      )

      const nodes = (await this.models.userIdLoader.loadMany(
        records.map((item: { id: string }) => `${item.id}`).filter(Boolean)
      )) as Item[]

      return { nodes, totalCount }
    } catch (err) {
      logger.error(`searchV3 ERROR:`, err)
      return { nodes: [], totalCount: 0 }
    }
  }

  public findRecentSearches = async (userId: string) => {
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

  public clearSearches = (userId: string) =>
    this.knex('search_history')
      .where({ userId, archived: false })
      .update({ archived: true })

  /*********************************
   *                               *
   *        Appreciation           *
   *                               *
   *********************************/
  public totalRecived = async (recipientId: string) => {
    const result = await this.knex('appreciation')
      .where({
        recipientId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .sum('amount as total')

    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  public totalRecivedAppreciationCount = async (recipientId: string) => {
    const result = await this.knex('appreciation')
      .where({
        recipientId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .count()
    return parseInt(`${result[0].count}` || '0', 10)
  }

  public totalSentAppreciationCount = async (senderId: string) => {
    const result = await this.knex('appreciation')
      .where({
        senderId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .count()
    return parseInt(`${result[0].count}` || '0', 10)
  }

  public totalSent = async (senderId: string) => {
    const result = await this.knex('appreciation')
      .where({
        senderId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .sum('amount as total')
    return Math.max(parseInt(result[0].total || 0, 10), 0)
  }

  public findAppreciationBySender = async ({
    senderId,
    take,
    skip,
  }: {
    senderId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex('appreciation')
      .where({
        senderId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  public findAppreciationByRecipient = async ({
    recipientId,
    take,
    skip,
  }: {
    recipientId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex('appreciation')
      .where({
        recipientId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }
    return query
  }

  /*********************************
   *                               *
   *             Follow            *
   *                               *
   *********************************/
  public follow = async (userId: string, targetId: string) => {
    const data = {
      userId,
      targetId,
      action: USER_ACTION.follow,
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: data,
      table: 'action_user',
    })
  }

  public unfollow = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.follow,
      })
      .del()

  public countFollowees = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({
        userId,
        action: USER_ACTION.follow,
      })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public countFollowers = async (targetId: string) => {
    const result = await this.knex('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findFollowees = async ({
    userId,
    take,
    skip,
  }: {
    userId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_user')
      .where({ userId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  public findFollowers = async ({
    targetId,
    take,
    skip,
  }: {
    targetId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')

    if (skip) {
      query.andWhere('id', '<', skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  // retrieve circle members and followers
  public findCircleRecipients = async (circleId: string) => {
    const [members, followers] = await Promise.all([
      this.knex
        .from('circle_subscription_item as csi')
        .join('circle_price', 'circle_price.id', 'csi.price_id')
        .join('circle_subscription as cs', 'cs.id', 'csi.subscription_id')
        .where({
          'circle_price.circle_id': circleId,
          'circle_price.state': PRICE_STATE.active,
          'csi.archived': false,
        })
        .whereIn('cs.state', [
          SUBSCRIPTION_STATE.active,
          SUBSCRIPTION_STATE.trialing,
        ]),

      this.knex
        .from('action_circle')
        .select('user_id')
        .where({ target_id: circleId, action: CIRCLE_ACTION.follow }),
    ])

    return Array.from(
      new Set([
        ...members.map((s) => s.userId),
        ...followers.map((f) => f.userId),
      ])
    )
  }

  public isFollowing = async ({
    userId,
    targetId,
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
  public block = async (userId: string, targetId: string) => {
    const data = {
      userId,
      targetId,
      action: USER_ACTION.block,
    }

    return this.baseUpdateOrCreate<ActionUser>({
      where: data,
      data,
      table: 'action_user',
    })
  }

  public unblock = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.block,
      })
      .del()

  public blocked = async ({
    userId,
    targetId,
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

  public countBlockList = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({ userId, action: USER_ACTION.block })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findBlockList = async ({
    userId,
    take,
    skip,
  }: {
    userId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_user')
      .where({ userId, action: USER_ACTION.block })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /*********************************
   *                               *
   *           Recommand           *
   *                               *
   *********************************/
  public recommendAuthors = async ({
    take,
    skip,
    notIn = [],
    oss = false,
    type = AUTHOR_TYPE.default,
    count = false,
  }: {
    take?: number
    skip?: number
    notIn?: string[]
    oss?: boolean
    type?: keyof typeof AUTHOR_TYPE
    count?: boolean
  }) => {
    switch (type) {
      case AUTHOR_TYPE.default: {
        const table = oss
          ? VIEW.user_reader_view
          : MATERIALIZED_VIEW.user_reader_materialized
        const query = this.knexRO(table)
          .orderByRaw('author_score DESC NULLS LAST')
          .orderBy('id', 'desc')
          .where({ state: USER_STATE.active })
          .whereNot({ userName: null })
          .whereNotIn('id', notIn)

        if (skip) {
          query.offset(skip)
        }
        if (take || take === 0) {
          query.limit(take)
        }
        if (count) {
          query.select(
            '*',
            this.knexRO.raw('COUNT(id) OVER() ::int AS total_count')
          )
        } else {
          query.select('*')
        }

        return query
      }
      case AUTHOR_TYPE.active:
      case AUTHOR_TYPE.appreciated:
      case AUTHOR_TYPE.trendy: {
        const view =
          type === AUTHOR_TYPE.active
            ? 'most_active_author_materialized'
            : type === AUTHOR_TYPE.appreciated
            ? 'most_appreciated_author_materialized'
            : 'most_trendy_author_materialized'

        const query = this.knexRO
          .from({ view })
          .innerJoin('user', 'view.id', 'user.id')
          .where({ state: USER_STATE.active })
          .whereNotIn('view.id', notIn)

        if (skip) {
          query.offset(skip)
        }
        if (take || take === 0) {
          query.limit(take)
        }
        if (count) {
          query.select(
            '*',
            this.knexRO.raw('COUNT(id) OVER() ::int AS total_count')
          )
        } else {
          query.select('*')
        }

        return query
      }
    }
  }

  public findBoost = async (userId: string) => {
    const userBoost = await this.knex('user_boost')
      .select()
      .where({ userId })
      .first()

    if (!userBoost) {
      return 1
    }

    return userBoost.boost
  }

  public setBoost = async ({ id, boost }: { id: string; boost: number }) =>
    this.baseUpdateOrCreate<UserBoost>({
      where: { userId: id },
      data: { userId: id, boost },
      table: 'user_boost',
    })

  public findScore = async (userId: string) => {
    const author = await this.knex('user_reader_view')
      .select()
      .where({ id: userId })
      .first()
    return author.authorScore || 0
  }

  public recommendTags = ({ skip, take }: { skip: number; take: number }) =>
    this.knex('tag')
      .select('*')
      .join(
        this.knex('article_tag')
          .select('tag_id')
          .max('created_at', { as: 'last_article_added' })
          .count('id', { as: 'article_count' })
          .groupBy('tag_id')
          .as('t1'),
        function () {
          this.on('t1.tag_id', '=', 'tag.id')
        }
      )
      .join(
        this.knex('action_tag')
          .select('target_id')
          .max('created_at', { as: 'last_follower_added' })
          .count('id', { as: 'follower_count' })
          .where('action', 'follow')
          .groupBy('target_id')
          .as('t2'),
        function () {
          this.on('t2.target_id', '=', 'tag.id')
        }
      )
      .where(
        'last_article_added',
        '>=',
        this.knex.raw(`now() - interval '2 month'`)
      )
      .orWhere(
        'last_follower_added',
        '>=',
        this.knex.raw(`now() - interval '2 month'`)
      )
      .andWhere('article_count', '>=', 8)
      .orderBy('follower_count', 'desc')
      .offset(skip)
      .limit(take)

  public countRecommendTags = async () => {
    const result = await this.knex()
      .count('*')
      .from(
        this.knex('article_tag')
          .select('tag_id')
          .max('created_at', { as: 'last_article_added' })
          .count('id', { as: 'article_count' })
          .groupBy('tag_id')
          .as('t1')
      )
      .fullOuterJoin(
        this.knex('action_tag')
          .select('target_id')
          .max('created_at', { as: 'last_follower_added' })
          .count('id', { as: 'follower_count' })
          .where('action', 'follow')
          .groupBy('target_id')
          .as('t2'),
        function () {
          this.on('t2.target_id', '=', 't1.tag_id')
        }
      )
      .where(
        'last_article_added',
        '>=',
        this.knex.raw(`now() - interval '2 month'`)
      )
      .orWhere(
        'last_follower_added',
        '>=',
        this.knex.raw(`now() - interval '2 month'`)
      )
      .andWhere('article_count', '>=', 8)
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /*********************************
   *                               *
   *         Notify Setting        *
   *                               *
   *********************************/
  public findNotifySetting = async (
    userId: string
  ): Promise<UserNotifySetting> =>
    this.knex.select().from('user_notify_setting').where({ userId }).first()

  public updateNotifySetting = async (
    id: string,
    data: ItemData
  ): Promise<UserNotifySetting> =>
    this.baseUpdate(id, data, 'user_notify_setting')

  /*********************************
   *                               *
   *         Subscription          *
   *                               *
   *********************************/
  public countSubscription = async (userId: string) => {
    const result = await this.knex('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findSubscriptions = async ({
    userId,
    take,
    skip,
  }: {
    userId: string
    take?: number
    skip?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .orderBy('id', 'desc')

    if (skip) {
      query.offset(skip)
    }
    if (take || take === 0) {
      query.limit(take)
    }

    return query
  }

  /*********************************
   *                               *
   *         Read History          *
   *                               *
   *********************************/
  public countReadHistory = async (userId: string) => {
    const result = await this.knex('article_read_count')
      .where({ userId, archived: false })
      .countDistinct('article_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  public findReadHistory = async ({
    userId,
    take,
    skip,
  }: {
    userId: string
    take: number
    skip: number
  }) => {
    const result = await this.knexRO('article')
      .select('read.read_at', 'article.*')
      .rightJoin(
        this.knex
          .select('read.article_id', 'read.updated_at as read_at')
          .from('article_read_count as read')
          .where({ userId, archived: false })
          .as('read'),
        'article.id',
        'read.article_id'
      )
      .where({ state: ARTICLE_STATE.active })
      .orderBy('read_at', 'desc')
      .limit(take)
      .offset(skip)

    return result.map(({ readAt, ...article }: { readAt: Date } & Article) => ({
      readAt,
      article,
    }))
  }

  public clearReadHistory = async ({
    articleId,
    userId,
  }: {
    articleId?: string
    userId: string | null
  }) =>
    this.knex('article_read_count')
      .where({ userId, ...(articleId ? { articleId } : {}) })
      .update({ archived: true })

  /**
   * Activate user
   */
  public activate = async ({ id }: { id: string }) => {
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
  public createVerificationCode = ({
    userId,
    email,
    type,
    strong,
    expiredAt,
  }: {
    userId?: string | null
    email: string
    type: keyof typeof VERIFICATION_CODE_TYPE
    strong?: boolean
    expiredAt?: Date
  }) => {
    const code = strong
      ? nanoid(40)
      : customAlphabet(
          // alphanumeric
          '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
          8
        )()

    return this.baseCreate<VerificationCode>(
      {
        uuid: v4(),
        userId,
        email,
        type,
        code,
        status: VERIFICATION_CODE_STATUS.active,
        expiredAt:
          expiredAt || new Date(Date.now() + VERIFICATION_CODE_EXPIRED_AFTER),
      },
      'verification_code'
    )
  }

  public verifyVerificationCode = async ({
    email,
    type,
    code: codeString,
    userId,
  }: {
    email: string
    type: keyof typeof VERIFICATION_CODE_TYPE
    code: string
    userId?: string
  }) => {
    const codes = await this.findVerificationCodes({
      where: {
        type,
        email,
      },
    })
    const code = codes.find((c) => c.code === codeString)

    if (codes.length === 0 || !code) {
      throw new CodeInvalidError('code does not exists')
    }
    // check code
    if (
      [
        VERIFICATION_CODE_STATUS.inactive,
        VERIFICATION_CODE_STATUS.used,
      ].includes(code.status)
    ) {
      throw new CodeInactiveError('code is retired')
    }
    if (code.expiredAt < new Date()) {
      // mark code status as expired
      await this.markVerificationCodeAs({
        codeId: code.id,
        status: VERIFICATION_CODE_STATUS.expired,
      })
      throw new CodeExpiredError('code is expired')
    }
    if (userId && code.userId !== userId) {
      throw new CodeInvalidError('code does not match user')
    }
    const trx = await this.knex.transaction()
    for (const c of codes) {
      await (c.code === code.code
        ? this.markVerificationCodeAs(
            { codeId: c.id, status: VERIFICATION_CODE_STATUS.used },
            trx
          )
        : this.markVerificationCodeAs(
            { codeId: c.id, status: VERIFICATION_CODE_STATUS.inactive },
            trx
          ))
    }
    await trx.commit()
  }

  public confirmVerificationCode = async (code: VerificationCode) => {
    if (code.status !== VERIFICATION_CODE_STATUS.active) {
      throw new Error('cannot verfiy a not-active code')
    }
    const codes = await this.findVerificationCodes({
      where: {
        type: code.type,
        email: code.email,
        status: VERIFICATION_CODE_STATUS.active,
      },
    })
    const trx = await this.knex.transaction()
    for (const c of codes) {
      await (c.code === code.code
        ? this.markVerificationCodeAs(
            { codeId: c.id, status: VERIFICATION_CODE_STATUS.verified },
            trx
          )
        : this.markVerificationCodeAs(
            { codeId: c.id, status: VERIFICATION_CODE_STATUS.inactive },
            trx
          ))
    }
    await trx.commit()
  }

  public findVerificationCodes = async ({
    where,
  }: {
    where?: Partial<VerificationCode>
  }) => {
    const query = this.knex
      .select()
      .from('verification_code')
      .orderBy('id', 'desc')

    if (where) {
      query.where(where)
    }

    return query
  }

  public markVerificationCodeAs = (
    {
      codeId,
      status,
    }: {
      codeId: string
      status: VERIFICATION_CODE_STATUS
    },
    trx?: Knex.Transaction
  ) => {
    let data: Partial<VerificationCode> = { status }

    if (status === VERIFICATION_CODE_STATUS.used) {
      data = { ...data, usedAt: new Date() }
    } else if (status === VERIFICATION_CODE_STATUS.verified) {
      data = { ...data, verifiedAt: new Date() }
    }

    return this.baseUpdate(codeId, data, 'verification_code', trx)
  }

  /*********************************
   *                               *
   *           Donation            *
   *                               *
   *********************************/
  /**
   * Count times of donation received by user
   */
  public countReceivedDonation = async (recipientId: string) => {
    const result = await this.knex('transaction')
      .countDistinct('id')
      .where({
        recipientId,
        state: TRANSACTION_STATE.succeeded,
        purpose: TRANSACTION_PURPOSE.donation,
      })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count articles donated by user
   */
  public countDonatedArticle = async (senderId: string) => {
    const result = await this.knex('transaction')
      .countDistinct('target_id')
      .where({
        senderId,
        state: TRANSACTION_STATE.succeeded,
        purpose: TRANSACTION_PURPOSE.donation,
      })
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Count donators to this recipient
   */
  public countDonators = async (
    recipientId: string,
    range?: { start?: Date; end?: Date }
  ) => {
    const query = this.knex('transaction').countDistinct('sender_id').where({
      recipientId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    })
    if (range?.start) {
      query.where('created_at', '>=', range.start)
    }
    if (range?.end) {
      query.where('created_at', '<', range.end)
    }
    const result = await query.first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Top donators to this recipient
   */
  public topDonators = async (
    recipientId: string,
    range?: { start?: Date; end?: Date },
    pagination?: { skip?: number; take?: number }
  ) => {
    const query = this.knex('transaction').where({
      recipientId,
      state: TRANSACTION_STATE.succeeded,
      purpose: TRANSACTION_PURPOSE.donation,
    })
    if (range?.start) {
      query.where('created_at', '>=', range.start)
    }
    if (range?.end) {
      query.where('created_at', '<', range.end)
    }

    query
      .groupBy('sender_id')
      .select(
        'sender_id',
        this.knex.raw('COUNT(sender_id)'),
        this.knex.raw('MAX(created_at)')
      )
      .orderBy([
        { column: 'count', order: 'desc' },
        { column: 'max', order: 'desc' },
      ])

    if (pagination) {
      const { skip, take } = pagination
      if (skip) {
        query.offset(skip)
      }
      if (take || take === 0) {
        query.limit(take)
      }
    }

    return (await query).map((item) => ({
      senderId: item.senderId,
      count: parseInt(item.count, 10),
    }))
  }

  /*********************************
   *                               *
   *         OAuth:LikeCoin        *
   *                               *
   *********************************/
  public findLiker = async ({
    userId,
    likerId,
  }: {
    userId?: string
    likerId?: string
  }): Promise<UserOAuthLikeCoin | null> => {
    let userLikerId = likerId
    if (userId) {
      const user = await this.models.userIdLoader.load(userId)
      if (user.likerId) {
        userLikerId = user.likerId
      }
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

  public saveLiker = async ({
    userId,
    likerId,
    accountType,
    accessToken,
    refreshToken,
    expires,
    scope,
  }: {
    userId: string
    likerId: string
    accountType: UserOAuthLikeCoinAccountType
    accessToken: string
    refreshToken?: string
    expires?: Date
    scope?: string[]
  }) => {
    let user = await this.models.userIdLoader.load(userId)

    await this.knex
      .select()
      .from('user_oauth_likecoin')
      .where({ likerId: user.likerId })
      .del()

    user = await this.baseUpdate(userId, {
      likerId,
    })

    await this.baseUpdateOrCreate<UserOauthLikecoinDB>({
      where: { likerId },
      data: {
        likerId,
        accountType,
        accessToken,
        refreshToken,
        expires,
        scope,
      },
      table: 'user_oauth_likecoin',
    })

    return user
  }

  public updateLiker = ({
    likerId,
    ...data
  }: {
    [key: string]: any
    likerId: string
  }) =>
    this.knex
      .select()
      .from('user_oauth_likecoin')
      .where({ likerId })
      .update(data)

  // register a new LikerId by a given userName
  public registerLikerId = async ({
    userId,
    userName,
    ip,
  }: {
    userId: string
    userName: string
    ip?: string
  }) => {
    // check
    const likerId = await this.likecoin.check({ user: userName })

    // register
    const oAuthService = new OAuthService(this.connections)
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })
    const { accessToken, refreshToken, scope } = await this.likecoin.register({
      user: likerId,
      token: tokens.accessToken,
      ip,
    })

    // save to db
    return this.saveLiker({
      userId,
      likerId,
      accountType: 'general',
      accessToken,
      refreshToken,
      scope,
    })
  }

  // Promote a platform temp LikerID
  public claimLikerId = async ({
    userId,
    liker,
    ip,
  }: {
    userId: string
    liker: UserOAuthLikeCoin
    ip?: string
  }) => {
    const oAuthService = new OAuthService(this.connections)
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })

    await this.likecoin.edit({
      action: 'claim',
      payload: { user: liker.likerId, platformToken: tokens.accessToken },
      ip,
    })

    return this.knex('user_oauth_likecoin')
      .where({ likerId: liker.likerId })
      .update({ accountType: 'general' })
  }

  // Transfer a platform temp LikerID's LIKE and binding to target LikerID
  public transferLikerId = async ({
    fromLiker,
    toLiker,
  }: {
    fromLiker: UserOAuthLikeCoin
    toLiker: Pick<UserOAuthLikeCoin, 'likerId' | 'accessToken'>
  }) =>
    this.likecoin.edit({
      action: 'transfer',
      payload: {
        fromUserToken: fromLiker.accessToken,
        toUserToken: toLiker.accessToken,
      },
    })

  // Update the platform ID <-> LikerID binding
  public bindLikerId = async ({
    userId,
    userToken,
  }: {
    userId: string
    userToken: string
  }) => {
    const oAuthService = new OAuthService(this.connections)
    const tokens = await oAuthService.generateTokenForLikeCoin({ userId })

    return this.likecoin.edit({
      action: 'bind',
      payload: {
        platformToken: tokens.accessToken,
        userToken,
      },
    })
  }

  /*********************************
   *                               *
   *             Punish            *
   *                               *
   *********************************/
  public findPunishRecordsByTime = ({
    state,
    archived,
    expiredAt,
  }: {
    state: string
    archived: boolean
    expiredAt: string
  }) =>
    this.knex
      .select()
      .from('punish_record')
      .where({ state, archived })
      .andWhere('expired_at', '<=', expiredAt)

  public archivePunishRecordsByUserId = ({
    state,
    userId,
  }: {
    state: string
    userId: string
  }) =>
    this.knex
      .select()
      .from('punish_record')
      .where({ userId, state })
      .update({ archived: true })

  public findOrCreateIPNSKey = async (userName: string) => {
    const user = await this.findByUserName(userName)
    if (!user) {
      return
    }
    const ipnsKeyRec = await this.models.findFirst({
      table: 'user_ipns_keys',
      where: { userId: user.id },
    })

    if (ipnsKeyRec) {
      return ipnsKeyRec
    }

    // create it if not existed
    const kname = `for-${user.userName}-${user.uuid}`
    const {
      // publicKey,
      privateKey,
    } = await this.ipfs.genKey()
    const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }) as string

    const { imported } = (await this.ipfs.importKey({ name: kname, pem }))!
    // if (!ipnsKey && res) { ipnsKey = res?.Id }
    const ipnsKey = imported.Id

    return this.models.create({
      table: 'user_ipns_keys',
      data: {
        userId: user.id,
        ipnsKey,
        privKeyPem: pem,
        privKeyName: kname,
      },
    })
  }

  /*********************************
   *                               *
   *        Restrictions           *
   *                               *
   *********************************/
  public findRestrictions = async (id: string): Promise<UserRestriction[]> => {
    const table = 'user_restriction'
    return this.models.findMany({
      table,
      select: ['type', 'createdAt'],
      where: { userId: id },
    })
  }

  public updateRestrictions = async (
    id: string,
    types: Array<keyof typeof USER_RESTRICTION_TYPE>
  ) => {
    const olds = (await this.findRestrictions(id)).map(({ type }) => type)
    const news = [...new Set(types)]
    const toAdd = news.filter((i) => !olds.includes(i))
    const toDel = olds.filter((i) => !news.includes(i))
    await Promise.all([
      ...toAdd.map((i) => this.addRestriction(id, i)),
      ...toDel.map((i) => this.removeRestriction(id, i)),
    ])
  }

  public addRestriction = async (
    id: string,
    type: keyof typeof USER_RESTRICTION_TYPE
  ) => {
    const table = 'user_restriction'
    await this.models.create({ table, data: { userId: id, type } })
  }

  public removeRestriction = async (
    id: string,
    type: keyof typeof USER_RESTRICTION_TYPE
  ) => {
    const table = 'user_restriction'
    await this.models.deleteMany({ table, where: { userId: id, type } })
  }

  public findRestrictedUsersAndCount = async ({
    skip,
    take,
  }: { skip?: number; take?: number } = {}) => {
    const users = await this.knexRO
      .select('user.*', this.knexRO.raw('COUNT(1) OVER() ::int AS total_count'))
      .from('user')
      .join('user_restriction', 'user.id', 'user_restriction.user_id')
      .groupBy('user.id')
      .orderByRaw('MAX(user_restriction.created_at) DESC')
      .modify((builder: Knex.QueryBuilder) => {
        if (skip !== undefined && Number.isFinite(skip)) {
          builder.offset(skip)
        }
        if (take !== undefined && Number.isFinite(take)) {
          builder.limit(take)
        }
      })

    return [users, users[0]?.totalCount || 0]
  }

  public banUser = async (
    userId: string,
    {
      banDays,
      remark,
      noticeType,
    }: {
      noticeType?: OFFICIAL_NOTICE_EXTEND_TYPE
      banDays?: number
      remark?: ValueOf<typeof USER_BAN_REMARK>
    } = {}
  ) => {
    const notificationService = new NotificationService(this.connections)
    // trigger notification
    notificationService.trigger({
      event: noticeType ?? OFFICIAL_NOTICE_EXTEND_TYPE.user_banned,
      recipientId: userId,
    })

    // insert record into punish_record
    if (typeof banDays === 'number') {
      const expiredAt = getPunishExpiredDate(banDays)
      await this.baseCreate<PunishRecord>(
        {
          userId,
          state: USER_STATE.banned,
          expiredAt,
        },
        'punish_record'
      )
    }

    const data = {
      state: USER_STATE.banned,
      updatedAt: new Date(),
    }

    return await this.baseUpdate(userId, remark ? { ...data, remark } : data)
  }

  public unbanUser = async (
    userId: string,
    state: ValueOf<typeof USER_STATE>
  ) => {
    // clean up punish recods if team manually recover it from ban
    await this.archivePunishRecordsByUserId({
      userId,
      state: USER_STATE.banned,
    })
    return await this.baseUpdate(userId, { state })
  }

  public verifyWalletSignature = async ({
    ethAddress,
    nonce,
    signedMessage,
    signature,
    validPurposes,
  }: {
    ethAddress: string
    nonce: string
    signedMessage: Hex
    signature: Hex
    validPurposes: Array<keyof typeof SIGNING_MESSAGE_PURPOSE>
  }) => {
    if (!ethAddress || !isAddress(ethAddress)) {
      throw new UserInputError('address is invalid')
    }
    const sigTable = 'crypto_wallet_signature'

    const atomService = new AtomService(this.connections)
    const lastSigning = await atomService.findFirst({
      table: sigTable,
      where: (builder: Knex.QueryBuilder) =>
        builder
          .where({ address: ethAddress })
          .whereNull('signature')
          .whereRaw('expired_at > CURRENT_TIMESTAMP'),
      orderBy: [{ column: 'id', order: 'desc' }],
    })

    if (!lastSigning) {
      throw new EthAddressNotFoundError(
        `wallet signing for "${ethAddress}" not found`
      )
    }

    if (!validPurposes.includes(lastSigning.purpose)) {
      throw new UserInputError('Invalid purpose')
    }

    if (nonce !== lastSigning.nonce) {
      throw new UserInputError('Invalid nonce')
    }

    const isValidSignature = async () => {
      // verify signature for EOA account
      const verifiedAddress = await recoverMessageAddress({
        message: signedMessage,
        signature: signature,
      })

      if (ethAddress.toLowerCase() === verifiedAddress.toLowerCase()) {
        return
      }

      // try to verify signature for contract wallet
      const client = createPublicClient({
        chain: polygon,
        transport: http(BLOCKCHAIN_RPC[polygon.id]),
      })
      const bytecode = await client.getBytecode({ address: ethAddress })
      const isSmartContract = bytecode && trim(bytecode) !== '0x'
      if (isSmartContract) {
        // verify the message for a decentralized account (contract wallet)
        const contractWallet = getContract({
          publicClient: client,
          abi: IERC1271,
          address: ethAddress,
        })

        const verification = await contractWallet.read.isValidSignature([
          hashMessage(signedMessage),
          signature,
        ])

        const MAGICVALUE = '0x1626ba7e'
        if (verification !== MAGICVALUE) {
          throw new UserInputError('signature is not valid')
        }
      } else {
        throw new UserInputError('signature is not valid')
      }
    }

    await isValidSignature()
    return lastSigning
  }

  public addWallet = async (
    userId: string,
    ethAddress: string
  ): Promise<User> => {
    try {
      const res = await this._addWallet(userId, ethAddress)
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.addWallet,
        newValue: ethAddress,
        status: AUDIT_LOG_STATUS.succeeded,
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.addWallet,
        newValue: ethAddress,
        remark: err.message,
        status: AUDIT_LOG_STATUS.failed,
      })
      throw err
    }
  }

  private _addWallet = async (
    userId: string,
    ethAddress: string
  ): Promise<User> => {
    const user = await this.findByEthAddress(ethAddress)
    if (user) {
      if (user.state === USER_STATE.archived) {
        throw new ForbiddenByStateError('eth address is archived')
      }
      throw new CryptoWalletExistsError('eth address already has a user')
    }
    const updatedUser = await this.baseUpdate(userId, {
      ethAddress: ethAddress.toLowerCase(), // save the lower case ones
    })

    // archive crypto_wallet entry
    const atomService = new AtomService(this.connections)
    await atomService.update({
      table: 'crypto_wallet',
      where: { userId, archived: false },
      data: { archived: true },
    })

    return updatedUser
  }

  public removeWallet = async (userId: string): Promise<User> => {
    try {
      const res = await this._removeWallet(userId)
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.removeWallet,
        status: AUDIT_LOG_STATUS.succeeded,
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION.removeWallet,
        remark: err.message,
        status: AUDIT_LOG_STATUS.failed,
      })
      throw err
    }
  }

  private _removeWallet = async (userId: string): Promise<User> => {
    const user = await this.models.userIdLoader.load(userId)
    if (!user.ethAddress) {
      throw new ActionFailedError('user does not have a wallet')
    }
    const count = await this.countLoginMethods(userId)
    if (count === 1) {
      throw new ActionFailedError('cannot remove last login method')
    }
    return this.baseUpdate(userId, { ethAddress: null })
  }

  /*********************************
   *                               *
   *        Social Login           *
   *                               *
   *********************************/
  /**
   * Social login / signup logic
   *
   * PRD:
   * @see {@url https://www.notion.so/matterslab/147392419ea24b74ac939ebbcf6a3f0e#ffc068c50209465faf1e155395dc55f2}
   */
  public getOrCreateUserBySocialAccount = async ({
    type,
    providerAccountId,
    userName,
    email,
    emailVerified,
    language,
    referralCode,
  }: Omit<SocialAccount, 'userId'> & {
    emailVerified?: boolean
    language: LANGUAGES
    referralCode?: string
  }) => {
    try {
      const [user, created] = await this._getOrCreateUserBySocialAccount({
        type,
        providerAccountId,
        userName,
        email,
        emailVerified,
        language,
        referralCode,
      })
      if (created) {
        auditLog({
          actorId: user.id,
          action: AUDIT_LOG_ACTION[`socialSignup${type}`],
          status: AUDIT_LOG_STATUS.succeeded,
        })

        // no await to put data async
        this.aws.putMetricData({
          MetricData: [
            {
              MetricName: METRICS_NAMES.UserRegistrationCount,
              // Counts: [1],

              Dimensions: [
                {
                  Name: 'reg_type' /* required */,
                  Value: 'social' /* required */,
                },
                /* more items */
              ],
              Timestamp: new Date(),
              Unit: 'Count',
              Value: 1,
            },
          ],
        })
      } else {
        auditLog({
          actorId: user.id,
          action: AUDIT_LOG_ACTION[`socialLogin${type}`],
          status: AUDIT_LOG_STATUS.succeeded,
        })
      }
      return user
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: null,
        action: AUDIT_LOG_ACTION[`socialLogin${type}`],
        remark: err.message,
        status: AUDIT_LOG_STATUS.failed,
      })
      throw err
    }
  }

  private _getOrCreateUserBySocialAccount = async ({
    type,
    providerAccountId,
    userName,
    email,
    emailVerified,
    language,
    referralCode,
  }: Omit<SocialAccount, 'userId'> & {
    emailVerified?: boolean
    language: LANGUAGES
    referralCode?: string
  }): Promise<[User, boolean]> => {
    let isCreated = false
    // check if social account exists, if true, return user directly
    const socialAcount = await this.getSocialAccount({
      type,
      providerAccountId,
    })
    let user
    if (socialAcount) {
      user = await this.models.userIdLoader.load(socialAcount.userId)
      if (user && user.state === USER_STATE.archived) {
        throw new ForbiddenByStateError('social account is archived')
      }
      if (!user.emailVerified && emailVerified) {
        return [await this.baseUpdate(user.id, { emailVerified }), isCreated]
      }
      return [user, isCreated]
    }

    // social account not exists, create social account and user
    if (email) {
      user = await this.findByEmail(email)
    }
    const trx = await this.knex.transaction()
    try {
      if (!user) {
        // social account email not used by existing users, create new user
        user = await this.create(
          { email, emailVerified, language, referralCode },
          trx
        )
        isCreated = true
      } else if (user && (!user.emailVerified || !emailVerified)) {
        // social account have email but not verified, create new user
        // or social account email have been used by existing user but not verified, create new user w/o email
        user = await this.create({ language, referralCode }, trx)
        isCreated = true
      } else {
        // social account email have been used by existing user and verified.
        // check if this user have social account already, if true, create new user
        const socialAccounts = await this.findSocialAccountsByUserId(
          user.id,
          type
        )
        if (socialAccounts.length > 0) {
          user = await this.create({ language, referralCode }, trx)
          isCreated = true
        }
      }
      await this.createSocialAccount(
        { userId: user.id, type, providerAccountId, userName, email },
        trx
      )
      await trx.commit()
    } catch (error) {
      await trx.rollback()
      throw error
    }
    return [user, isCreated]
  }

  private getSocialAccount = async ({
    type,
    providerAccountId,
  }: Pick<SocialAccount, 'type' | 'providerAccountId'>) => {
    return this.knex('social_account')
      .select()
      .where({ type, providerAccountId })
      .first()
  }

  public findSocialAccountsByUserId = async (
    userId: string,
    type?: keyof typeof SOCIAL_LOGIN_TYPE
  ) => {
    const query = this.knex('social_account').select().where({ userId })
    if (type) {
      query.andWhere({ type })
    }
    return query
  }

  public createSocialAccount = async (
    { userId, type, providerAccountId, userName, email }: SocialAccount,
    trx?: Knex.Transaction
  ) => {
    try {
      const res = await this._createSocialAccount(
        { userId, type, providerAccountId, userName, email },
        trx
      )
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION[`addSocialAccount${type}`],
        entity: 'social_account',
        status: AUDIT_LOG_STATUS.succeeded,
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION[`addSocialAccount${type}`],
        entity: 'social_account',
        remark: err.message,
        status: AUDIT_LOG_STATUS.failed,
      })
      throw err
    }
  }

  private _createSocialAccount = async (
    { userId, type, providerAccountId, userName, email }: SocialAccount,
    trx?: Knex.Transaction
  ) => {
    const query = this.knex('social_account')
      .insert({ userId, type, providerAccountId, userName, email })
      .returning('*')

    if (trx) {
      query.transacting(trx)
    }

    try {
      const result = await query
      return result
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      // duplicate key error
      if (err.code === '23505') {
        const socialAccount = await this.getSocialAccount({
          type,
          providerAccountId,
        })
        if (socialAccount) {
          const user = await this.models.userIdLoader.load(socialAccount.userId)
          if (user.state === USER_STATE.archived) {
            throw new ForbiddenByStateError('social account is archived')
          }
        }
        throw new ActionFailedError('social account already exists')
      }
      throw err
    }
  }

  public removeSocialAccount = async (
    userId: string,
    type: keyof typeof SOCIAL_LOGIN_TYPE
  ) => {
    try {
      const res = await this._removeSocialAccount(userId, type)
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION[`removeSocialAccount${type}`],
        status: AUDIT_LOG_STATUS.succeeded,
      })
      return res
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      auditLog({
        actorId: userId,
        action: AUDIT_LOG_ACTION[`removeSocialAccount${type}`],
        remark: err.message,
        status: AUDIT_LOG_STATUS.failed,
      })
      throw err
    }
  }

  private _removeSocialAccount = async (
    userId: string,
    type: keyof typeof SOCIAL_LOGIN_TYPE
  ) => {
    const socialAccount = await this.knex('social_account')
      .select()
      .where({ type, userId })
      .first()
    if (!socialAccount) {
      throw new ActionFailedError('social account not exists')
    }
    const count = await this.countLoginMethods(userId)
    if (count === 1) {
      throw new ActionFailedError('cannot remove last login method')
    }
    return this.knex('social_account').where({ id: socialAccount.id }).del()
  }

  /**
   * Fetch the Twitter user info using Twitter v2 API.
   * @see {@link https://developer.twitter.com/en/docs/authentication/oauth-2-0/user-access-token}
   */
  public fetchTwitterUserInfo = async (
    authorizationCode: string,
    codeVerifier: string
  ) => {
    const accessToken = await this.exchangeTwitterAccessToken(
      authorizationCode,
      codeVerifier
    )
    return this.fetchTwitterUserInfoByAccessToken(accessToken)
  }
  public fetchTwitterUserInfoOauth1 = async (
    oauthToken: string,
    oauthVerifier: string
  ) => {
    const twitter = new Twitter()
    let userInfo
    try {
      userInfo = await twitter.fetchAccessToken(oauthToken, oauthVerifier)
      return userInfo
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      throw new OAuthTokenInvalidError(err.message)
    } finally {
      if (userInfo) {
        twitter.invokeToken(userInfo.oauthToken, userInfo.oauthTokenSecret)
      }
    }
  }

  private exchangeTwitterAccessToken = async (
    authorizationCode: string,
    codeVerifier: string
  ) => {
    const url = 'https://api.twitter.com/2/oauth2/token'
    const data = {
      grant_type: 'authorization_code',
      code: authorizationCode,
      redirect_uri: environment.twitterRedirectUri,
      code_verifier: codeVerifier,
    }
    const headers = {
      Authorization: `Basic ${Buffer.from(
        `${environment.twitterClientId}:${environment.twitterClientSecret}`
      ).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    try {
      const response = await axios.post(url, data, { headers })
      return response.data.access_token
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response.status === 400) {
        logger.warn('exchange twitter failed: ', error.response.data)
        throw new OAuthTokenInvalidError('exchange twitter access token failed')
      } else {
        logger.error('exchange twitter error: ', error)
        throw new UnknownError('exchange twitter access token failed')
      }
    }
  }

  private fetchTwitterUserInfoByAccessToken = async (
    accessToken: string
  ): Promise<{ id: string; name: string; username: string }> => {
    const url = 'https://api.twitter.com/2/users/me'
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    }
    const response = await axios.get(url, { headers })
    if (response.status !== 200) {
      throw new ServerError('fetch twitter user info failed')
    }
    return response.data.data
  }

  /**
   * Fetch the Facebook user info using Facebook OIDC.
   * @see {@link https://developers.facebook.com/docs/facebook-login/guides/advanced/oidc-token}
   */
  public fetchFacebookUserInfo = async (
    authorizationCode: string,
    codeVerifier: string
  ) => {
    const { id_token, access_token } = await this.exchangeFacebookToken(
      authorizationCode,
      codeVerifier
    )

    // Facebook apps return app scoped id instead of real id, when we switch to another app, the returned id will be different.
    // when users have multi app scoped id, try return app scoped id exsited in db first
    const ids = await this.fetchFacebookUserAppScopedIds(access_token)
    if (ids.length > 1) {
      logger.warn('facebook user has multiple app scoped ids: %j', ids)
      for (const id of ids) {
        const account = await this.getSocialAccount({
          type: SOCIAL_LOGIN_TYPE.Facebook,
          providerAccountId: id,
        })
        if (account) {
          return { id: account.providerAccountId, username: account.userName }
        }
      }
    }

    // `scope=openid` in auth request, id_token should be returned
    if (id_token) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = jwt.decode(id_token) as any
      if (data.aud !== environment.facebookClientId) {
        throw new OAuthTokenInvalidError('Facebook token id aud is invalid')
      }
      return { id: data.sub, username: data.name }
    } else {
      // id_token not returned, fetch user info from graph api
      return await this._fetchFacebookUserInfo(access_token)
    }
  }
  private _fetchFacebookUserInfo = async (
    accessToken: string
  ): Promise<{ id: string; username: string }> => {
    try {
      const response = await axios.get(`https://graph.facebook.com/v18.0/me`, {
        params: {
          access_token: accessToken,
        },
      })
      return { id: response.data.id, username: response.data.name }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response.status === 400) {
        // logger.error('fetch facebook error: ', error)
        logger.warn(
          'fetch facebook user info by graphql api failed: ',
          error.response.data
        )
        throw new OAuthTokenInvalidError('exchange facebook app ids failed')
      }
      logger.error('fetch facebook app ids error: ', error)
      throw new UnknownError(
        'exchange facebook uesr info by graphql api failed'
      )
    }
  }

  /**
   * fetch facebook user all logged-in app scoped ids
   * @see {@link https://developers.facebook.com/docs/facebook-login/guides/map-users/}
   */
  private fetchFacebookUserAppScopedIds = async (
    accessToken: string
  ): Promise<string[]> => {
    try {
      const response = await axios.get(
        `https://graph.facebook.com/v18.0/me/ids_for_business`,
        {
          params: {
            access_token: accessToken,
          },
        }
      )
      return response.data.data.map((item: { id: string }) => item.id)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response.status === 400) {
        // logger.error('fetch facebook error: ', error)
        logger.warn('fetch facebook app ids failed: ', error.response.data)
        throw new OAuthTokenInvalidError('exchange facebook app ids failed')
      }
      logger.error('fetch facebook app ids error: ', error)
      throw new UnknownError('exchange facebook app ids failed')
    }
  }

  private exchangeFacebookToken = async (
    authorizationCode: string,
    codeVerifier: string
  ): Promise<{ access_token: string; id_token: string }> => {
    const url = 'https://graph.facebook.com/v18.0/oauth/access_token'
    try {
      const response = await axios.get(url, {
        params: {
          client_id: environment.facebookClientId,
          redirect_uri: environment.facebookRedirectUri,
          code: authorizationCode,
          code_verifier: codeVerifier,
        },
      })
      return response.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response.status === 400) {
        // logger.error('fetch facebook error: ', error)
        logger.warn('fetch facebook token failed: ', error.response.data)
        throw new OAuthTokenInvalidError('exchange facebook token failed')
      }
      logger.error('fetch facebook token error: ', error)
      throw new UnknownError('exchange facebook token failed')
    }
  }

  /**
   * Fetch the Google user info from Google OIDC.
   * @see {@link https://developers.google.com/identity/openid-connect/openid-connect}
   */
  public fetchGoogleUserInfo = async (
    authorizationCode: string,
    nonce: string
  ) => {
    const { id_token } = await this.exchangeGoogleToken(authorizationCode)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = jwt.decode(id_token) as any
    if (data.aud !== environment.googleClientId) {
      throw new OAuthTokenInvalidError('Google token id aud is invalid')
    }
    if (data.nonce !== nonce) {
      throw new OAuthTokenInvalidError('Google token id nonce is invalid')
    }
    return {
      id: data.sub,
      email: data.email,
      emailVerified: data.email_verified,
    }
  }

  private exchangeGoogleToken = async (
    authorizationCode: string
  ): Promise<{ access_token: string; id_token: string }> => {
    const url = 'https://oauth2.googleapis.com/token'
    const data = {
      code: authorizationCode,
      client_id: environment.googleClientId,
      client_secret: environment.googleClientSecret,
      redirect_uri: environment.googleRedirectUri,
      grant_type: 'authorization_code',
    }
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    }
    try {
      const response = await axios.post(url, data, { headers })
      return response.data
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      if (error.response.status === 400) {
        // logger.error('fetch facebook error: ', error)
        logger.warn('fetch google failed: ', error.response.data)
        throw new OAuthTokenInvalidError('exchange google token failed')
      }
      logger.error('fetch google error: ', error)
      throw new UnknownError('exchange google tokenfailed')
    }
  }

  private countLoginMethods = async (userId: string) => {
    const user = await this.models.userIdLoader.load(userId)
    const email = user.email ? 1 : 0
    const wallet = user.ethAddress ? 1 : 0
    const socialAccounts = await this.findSocialAccountsByUserId(userId)
    return email + wallet + socialAccounts.length
  }

  /*********************************
   *                               *
   *            Misc               *
   *                               *
   *********************************/
  public updateLastSeen = async (id: string, threshold = HOUR) => {
    const cacheService = new CacheService(
      CACHE_PREFIX.USER_LAST_SEEN,
      this.connections.redis
    )
    const _lastSeen = (await cacheService.getObject({
      keys: { id },
      getter: async () => {
        const { lastSeen } = await this.knex(this.table)
          .select('last_seen')
          .where({ id })
          .first()
        return lastSeen
      },
      expire: Math.ceil(threshold / 1000),
    })) as any
    const last = new Date(_lastSeen)
    const now = new Date()
    const delta = +now - +last
    if (delta > threshold) {
      await this.knex(this.table).update('last_seen', now).where({ id })
    }
  }

  public totalPinnedWorks = async (id: string): Promise<number> => {
    const res1 = await this.knex('article')
      .count()
      .where({ authorId: id, pinned: true, state: ARTICLE_STATE.active })
      .first()
    const res2 = await this.knex('collection')
      .count()
      .where({ authorId: id, pinned: true })
      .first()
    return (Number(res1?.count) || 0) + (Number(res2?.count) || 0)
  }
}

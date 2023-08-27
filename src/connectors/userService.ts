import type {
  GQLUserRestriction,
  Item,
  ItemData,
  UserOAuthLikeCoin,
  UserOAuthLikeCoinAccountType,
  User,
  VerficationCode,
  ValueOf,
  SocialAccount,
} from 'definitions'

import axios from 'axios'
import { compare } from 'bcrypt'
import DataLoader from 'dataloader'
import { recoverPersonalSignature } from 'eth-sig-util'
import { Contract, utils } from 'ethers'
import jwt from 'jsonwebtoken'
import { Knex } from 'knex'
import _, { random } from 'lodash'
import { customAlphabet, nanoid } from 'nanoid'
import { v4 } from 'uuid'

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
  BLOCKCHAIN_CHAINID,
  SIGNING_MESSAGE_PURPOSE,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  CryptoWalletExistsError,
  EthAddressNotFoundError,
  NameInvalidError,
  PasswordInvalidError,
  UserInputError,
  PasswordNotAvailableError,
  NameExistsError,
  EmailExistsError,
  CodeExpiredError,
  CodeInactiveError,
  CodeInvalidError,
  ServerError,
  OAuthTokenInvalidError,
  UnknownError,
  ForbiddenError,
} from 'common/errors'
import { getLogger } from 'common/logger'
import {
  generatePasswordhash,
  isValidUserName,
  isValidPassword,
  makeUserName,
  getPunishExpiredDate,
  getAlchemyProvider,
  IERC1271,
  genDisplayName,
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

import { likecoin } from './likecoin'
import { medium } from './medium'

const logger = getLogger('service-user')

// const SEARCH_DEFAULT_TEXT_RANK_THRESHOLD = 0.0001

export class UserService extends BaseService {
  ipfs: typeof ipfsServers
  likecoin: typeof likecoin
  medium: typeof medium

  constructor() {
    super('user')

    this.ipfs = ipfsServers
    this.likecoin = likecoin
    this.medium = medium
    this.dataloader = new DataLoader(this.baseFindByIds)
  }

  /*********************************
   *                               *
   *            Account            *
   *                               *
   *********************************/
  public loadById = async (id: string): Promise<User> =>
    this.dataloader.load(id) as Promise<User>
  public loadByIds = async (ids: string[]): Promise<User[]> =>
    this.dataloader.loadMany(ids) as Promise<User[]>

  public create = async (
    {
      userName,
      displayName,
      // description,
      password,
      email,
      ethAddress,
      emailVerified = true,
    }: {
      userName?: string
      displayName?: string
      // description?: string
      password?: string
      email?: string
      ethAddress?: string
      emailVerified?: boolean
    },
    trx?: Knex.Transaction
  ) => {
    const uuid = v4()
    const passwordHash = password
      ? await generatePasswordhash(password)
      : undefined
    const user = await this.baseCreate(
      _.omitBy(
        {
          uuid,
          email,
          emailVerified,
          userName,
          displayName,
          // description,
          // avatar,
          passwordHash,
          agreeOn: new Date(),
          state: USER_STATE.active,
          ethAddress,
        },
        _.isNil
      ),
      'user',
      undefined,
      undefined,
      trx
    )
    await this.baseCreate(
      { userId: user.id },
      'user_notify_setting',
      undefined,
      undefined,
      trx
    )

    return user
  }

  public postRegister = async (user: User) => {
    const notificationService = new NotificationService()
    const atomService = new AtomService()
    // auto follow matty
    await this.follow(user.id, environment.mattyId)

    // auto follow tags
    const tagService = new TagService()
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
      throw new PasswordNotAvailableError(
        'Password login not available for this user, login failed.'
      )
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
      if (user && user.state === USER_STATE.archived && archivedCallback) {
        await archivedCallback().catch((error) => logger.error(error))
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
      updatedAt: new Date(),
    })
    return user
  }

  public findByEmail = async (email: string): Promise<User | undefined> =>
    this.knex.select().from(this.table).where({ email }).first()

  public findByEmails = async (emails: string[]): Promise<User[]> =>
    this.knex.select().from(this.table).whereIn('email', emails)

  public findByUserName = async (userName: string): Promise<User> =>
    this.knex.select().from(this.table).where({ userName }).first()

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
    const user = await this.findByEmail(email)
    if (user && user.id !== userId) {
      throw new EmailExistsError('email already exists')
    } else if (user && user.id === userId) {
      return user
    } else {
      return await this.baseUpdate(userId, { email, emailVerified: false })
    }
  }

  public setPassword = async (
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

  public isUserNameEditable = async (userId: string) => {
    const history = await this.knex('username_edit_history')
      .select()
      .where({ userId })
    return history.length <= 0
  }

  public setUserName = async (
    userId: string,
    userName: string,
    fillDisplayName = true
  ): Promise<User> => {
    if (!isValidUserName(userName)) {
      throw new NameInvalidError('invalid user name')
    }

    if (await this.checkUserNameExists(userName)) {
      throw new NameExistsError('user name already exists')
    }
    let data: Partial<User> = { userName }
    if (fillDisplayName) {
      const user = await this.loadById(userId)
      data = { ...data, displayName: genDisplayName(user) ?? userName }
    }
    return await this.baseUpdate(userId, data)
  }

  /**
   * Check if user name (case insensitive) exists.
   */
  public checkUserNameExists = async (userName: string) => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where('userName', 'ILIKE', `%${userName}%`)
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
    key,
    keyOriginal,
    take,
    skip,
    exclude,
    viewerId,
    coefficients,
    quicksearch,
  }: {
    key: string
    keyOriginal?: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
    let coeffs = [1, 1, 1, 1]
    try {
      coeffs = JSON.parse(coefficients || '[]')
    } catch (err) {
      // do nothing
    }

    const c0 = +(coeffs?.[0] || environment.searchPgUserCoefficients?.[0] || 1)
    const c1 = +(coeffs?.[1] || environment.searchPgUserCoefficients?.[1] || 1)
    const c2 = +(coeffs?.[2] || environment.searchPgUserCoefficients?.[2] || 1)
    const c3 = +(coeffs?.[3] || environment.searchPgUserCoefficients?.[3] || 1)
    const c4 = +(coeffs?.[4] || environment.searchPgUserCoefficients?.[4] || 1)
    const c5 = +(coeffs?.[5] || environment.searchPgUserCoefficients?.[5] || 1)
    const c6 = +(coeffs?.[6] || environment.searchPgUserCoefficients?.[6] || 1)

    const searchUserName = key.startsWith('@') || key.startsWith('＠')
    const strippedName = key.replaceAll(/^[@＠]+/g, '').trim() // (searchUserName ? key.slice(1) : key).trim()

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

    const nodes = (await this.dataloader.loadMany(
      records.map(({ id }) => id)
    )) as Item[]

    return { nodes, totalCount }
  }

  public searchV3 = async ({
    key,
    // keyOriginal,
    take,
    skip,
    quicksearch,
  }: {
    key: string
    // keyOriginal?: string
    author?: string
    take: number
    skip: number
    viewerId?: string | null
    exclude?: keyof typeof SEARCH_EXCLUDE
    coefficients?: string
    quicksearch?: boolean
  }) => {
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

      const nodes = (await this.dataloader.loadMany(
        // records.map(({ id }) => id)
        // records.map((item: any) => item.id).filter(Boolean)
        records.map((item: any) => `${item.id}`).filter(Boolean)
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
      data: { updatedAt: new Date(), ...data },
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

    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
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
  public countAuthor = async ({
    notIn = [],
    oss = false,
    type = AUTHOR_TYPE.default,
  }: {
    notIn?: string[]
    oss?: boolean
    type: keyof typeof AUTHOR_TYPE
  }) => {
    switch (type) {
      case AUTHOR_TYPE.default: {
        const table = oss
          ? VIEW.user_reader_view
          : MATERIALIZED_VIEW.user_reader_materialized
        const result = await this.knex(table)
          .where({ state: USER_STATE.active })
          .whereNotIn('id', notIn)
          .count()
          .first()
        return parseInt(result ? (result.count as string) : '0', 10)
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
        const result = await this.knex
          .from({ view })
          .innerJoin('user', 'view.id', 'user.id')
          .where({ state: USER_STATE.active })
          .whereNotIn('view.id', notIn)
          .count()
          .first()
        return parseInt(result ? (result.count as string) : '0', 10)
      }
    }
  }

  public recommendAuthor = async ({
    take,
    skip,
    notIn = [],
    oss = false,
    type = AUTHOR_TYPE.default,
  }: {
    take?: number
    skip?: number
    notIn?: string[]
    oss?: boolean
    type?: keyof typeof AUTHOR_TYPE
  }) => {
    switch (type) {
      case AUTHOR_TYPE.default: {
        const table = oss
          ? VIEW.user_reader_view
          : MATERIALIZED_VIEW.user_reader_materialized
        const query = this.knexRO(table)
          .select()
          .orderByRaw('author_score DESC NULLS LAST')
          .orderBy('id', 'desc')
          .where({ state: USER_STATE.active })
          .whereNotIn('id', notIn)

        if (skip) {
          query.offset(skip)
        }
        if (take || take === 0) {
          query.limit(take)
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
          .select()
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
    this.baseUpdateOrCreate({
      where: { userId: id },
      data: { userId: id, boost, updatedAt: new Date() },
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
  public findNotifySetting = async (userId: string): Promise<any | null> =>
    this.knex.select().from('user_notify_setting').where({ userId }).first()

  public updateNotifySetting = async (
    id: string,
    data: ItemData
  ): Promise<any | null> =>
    this.baseUpdate(
      id,
      { updatedAt: new Date(), ...data },
      'user_notify_setting'
    )

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
    const result = await this.knex('article')
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

    return result.map(({ readAt, ...article }: any) => ({ readAt, article }))
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
    type: string
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

    return this.baseCreate(
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
  }: {
    email: string
    type: keyof typeof VERIFICATION_CODE_TYPE
    code?: string
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

  public confirmVerificationCode = async (code: VerficationCode) => {
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
    where?: {
      [key: string]: any
      type?: keyof typeof VERIFICATION_CODE_TYPE
      status?: VERIFICATION_CODE_STATUS
    }
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
    let data: any = { status }

    if (status === VERIFICATION_CODE_STATUS.used) {
      data = { ...data, usedAt: new Date() }
    } else if (status === VERIFICATION_CODE_STATUS.verified) {
      data = { ...data, verifiedAt: new Date() }
    }

    return this.baseUpdate(
      codeId,
      { updatedAt: new Date(), ...data },
      'verification_code',
      trx
    )
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
      likerId,
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
    const oAuthService = new OAuthService()
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
    const oAuthService = new OAuthService()
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
    const oAuthService = new OAuthService()
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
    const atomService = new AtomService()

    const ipnsKeyRec = await atomService.findFirst({
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

    return atomService.create({
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
  public findRestrictions = async (
    id: string
  ): Promise<GQLUserRestriction[]> => {
    const table = 'user_restriction'
    const atomService = new AtomService()
    return atomService.findMany({
      table,
      select: ['type', 'created_at'],
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
    const atomService = new AtomService()
    await atomService.create({ table, data: { userId: id, type } })
  }

  public removeRestriction = async (
    id: string,
    type: keyof typeof USER_RESTRICTION_TYPE
  ) => {
    const table = 'user_restriction'
    const atomService = new AtomService()
    await atomService.deleteMany({ table, where: { userId: id, type } })
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
    const notificationService = new NotificationService()
    // trigger notification
    notificationService.trigger({
      event: noticeType ?? OFFICIAL_NOTICE_EXTEND_TYPE.user_banned,
      recipientId: userId,
    })

    // insert record into punish_record
    if (typeof banDays === 'number') {
      const expiredAt = getPunishExpiredDate(banDays)
      await this.baseCreate(
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
    signedMessage: string
    signature: string
    validPurposes: Array<keyof typeof SIGNING_MESSAGE_PURPOSE>
  }) => {
    if (!ethAddress || !utils.isAddress(ethAddress)) {
      throw new UserInputError('address is invalid')
    }
    const sigTable = 'crypto_wallet_signature'

    const atomService = new AtomService()
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

    // if it's smart contract wallet
    const isValidSignature = async () => {
      const MAGICVALUE = '0x1626ba7e'

      const chainType = 'Polygon'

      const chainNetwork = 'PolygonMainnet'

      const provider = getAlchemyProvider(
        Number(BLOCKCHAIN_CHAINID[chainType][chainNetwork])
      )

      const bytecode = await provider.getCode(ethAddress.toLowerCase())

      const isSmartContract = bytecode && utils.hexStripZeros(bytecode) !== '0x'

      const hash = utils.hashMessage(signedMessage)

      if (isSmartContract) {
        // verify the message for a decentralized account (contract wallet)
        const contractWallet = new Contract(ethAddress, IERC1271, provider)
        const verification = await contractWallet.isValidSignature(
          hash,
          signature
        )

        const doneVerified = verification === MAGICVALUE

        if (!doneVerified) {
          throw new UserInputError('signature is not valid')
        }
      } else {
        // verify signature for EOA account
        const verifiedAddress = recoverPersonalSignature({
          data: signedMessage,
          sig: signature,
        }).toLowerCase()

        if (ethAddress.toLowerCase() !== verifiedAddress) {
          throw new UserInputError('signature is not valid')
        }
      }
    }
    await isValidSignature()
    return lastSigning
  }

  public addWallet = async (
    userId: string,
    ethAddress: string
  ): Promise<User> => {
    const user = await this.findByEthAddress(ethAddress)
    if (user) {
      throw new CryptoWalletExistsError('eth address already has a user')
    }
    const updatedUser = await this.baseUpdate(userId, {
      updatedAt: this.knex.fn.now(),
      ethAddress: ethAddress.toLowerCase(), // save the lower case ones
    })

    // archive crypto_wallet entry
    const atomService = new AtomService()
    await atomService.update({
      table: 'crypto_wallet',
      where: { userId, archived: false },
      data: { updatedAt: this.knex.fn.now(), archived: true },
    })

    return updatedUser
  }

  /*********************************
   *                               *
   *        Social Login           *
   *                               *
   *********************************/

  public getOrCreateUserBySocialAccount = async ({
    type,
    providerAccountId,
    userName,
    email,
    emailVerified,
  }: SocialAccount & { emailVerified?: boolean }) => {
    // check if social account exists, if true, return user directly
    const socialAcount = await this.getSocialAccount({
      type,
      providerAccountId,
      userName,
    })
    let user
    if (socialAcount) {
      user = await this.loadById(socialAcount.userId)
      if (!user.emailVerified && emailVerified) {
        return this.baseUpdate(user.id, { emailVerified })
      }
      return user
    }

    // social account not exists, create social account and user if not exists
    if (email) {
      user = await this.findByEmail(email)
    }
    const trx = await this.knex.transaction()
    let isCreated = false
    try {
      if (!user) {
        user = await this.create({ email, emailVerified }, trx)
        isCreated = true
      } else {
        if (!user.emailVerified && emailVerified) {
          user = await this.baseUpdate(
            user.id,
            { emailVerified },
            undefined,
            trx
          )
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
    if (isCreated) {
      await this.postRegister(user)
    }
    return user
  }

  private getSocialAccount = async ({
    type,
    providerAccountId,
  }: SocialAccount) => {
    return this.knex('social_account')
      .select()
      .where({ type, providerAccountId })
      .first()
  }

  public findSocialAccountsByUserId = async (userId: string) => {
    return this.knex('social_account').select().where({ userId })
  }

  public createSocialAccount = async (
    { userId, type, providerAccountId, userName, email }: SocialAccount,
    trx?: Knex.Transaction
  ) => {
    const query = this.knex('social_account')
      .insert({ userId, type, providerAccountId, userName, email })
      .returning('*')

    if (trx) {
      query.transacting(trx)
    }

    return query
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
    const { id_token } = await this.exchangeFacebookToken(
      authorizationCode,
      codeVerifier
    )
    const data = jwt.decode(id_token) as any
    if (data.aud !== environment.facebookClientId) {
      throw new OAuthTokenInvalidError('Facebook token id aud is invalid')
    }
    return { id: data.sub, username: data.name }
  }

  private exchangeFacebookToken = async (
    authorizationCode: string,
    codeVerifier: string
  ): Promise<{ access_token: string; id_token: string }> => {
    const url = 'https://graph.facebook.com/v17.0/oauth/access_token'
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
    } catch (error: any) {
      if (error.response.status === 400) {
        // logger.error('fetch facebook error: ', error)
        logger.warn('fetch facebook failed: ', error.response.data)
        throw new OAuthTokenInvalidError('exchange facebook token failed')
      }
      logger.error('fetch facebook error: ', error)
      throw new UnknownError('exchange facebook tokenfailed')
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

  /*********************************
   *                               *
   *            Misc               *
   *                               *
   *********************************/
  public updateLastSeen = async (id: string, threshold = HOUR) => {
    const cacheService = new CacheService(CACHE_PREFIX.USER_LAST_SEEN)
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

import { compare } from 'bcrypt'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import jwt from 'jsonwebtoken'
import { Knex } from 'knex'
import _, { random } from 'lodash'
import { customAlphabet, nanoid } from 'nanoid'
import { v4 } from 'uuid'

import {
  APPRECIATION_PURPOSE,
  ARTICLE_STATE,
  CACHE_PREFIX,
  CIRCLE_ACTION,
  COMMENT_STATE,
  HOUR,
  MATERIALIZED_VIEW,
  PRICE_STATE,
  SEARCH_KEY_TRUNCATE_LENGTH,
  SUBSCRIPTION_STATE,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
  USER_ACTION,
  USER_STATE,
  VERIFICATION_CODE_EXPIRED_AFTER,
  VERIFICATION_CODE_STATUS,
  VIEW,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  EthAddressNotFoundError,
  NameInvalidError,
  PasswordInvalidError,
  PasswordNotAvailableError,
  ServerError,
  UserInputError,
} from 'common/errors'
import logger from 'common/logger'
import {
  generatePasswordhash,
  isValidUserName,
  makeUserName,
} from 'common/utils'
import {
  AtomService,
  BaseService,
  CacheService,
  ipfsServers,
  OAuthService,
} from 'connectors'
import {
  GQLAuthorsType,
  GQLResetPasswordType,
  GQLSearchExclude,
  GQLVerificationCodeType,
  ItemData,
  UserOAuthLikeCoin,
  UserOAuthLikeCoinAccountType,
} from 'definitions'

import { likecoin } from './likecoin'
import { medium } from './medium'

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
  /**
   * Create a new user.
   */
  create = async ({
    userName,
    displayName,
    // description,
    password,
    email,
    ethAddress,
  }: {
    userName: string
    displayName?: string
    // description?: string
    password?: string
    email?: string
    ethAddress?: string
  }) => {
    // const avatar = null
    if (!email && !ethAddress) {
      throw new UserInputError(
        'email and ethAddress cannot be both empty to create user'
      )
    }

    const uuid = v4()
    const passwordHash = password
      ? await generatePasswordhash(password)
      : undefined
    const user = await this.baseCreate(
      _.omitBy(
        {
          uuid,
          email,
          emailVerified: true,
          userName,
          displayName,
          // description,
          // avatar,
          passwordHash,
          agreeOn: new Date(),
          state: USER_STATE.onboarding,
          ethAddress,
        },
        _.isNil
      )
    )
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')

    this.addToSearch(user)

    return user
  }

  verifyPassword = async ({
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
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  loginByEmail = async ({
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
        await archivedCallback().catch((error) => logger.error)
      }
      throw new EmailNotFoundError('Cannot find user with email, login failed.')
    }

    if (!user.passwordHash) {
      throw new PasswordNotAvailableError(
        'Password login not available for this user, login failed.'
      )
    }

    await this.verifyPassword({ password, hash: user.passwordHash })

    const token = jwt.sign({ id: user.id }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN_MS / 1000,
    })

    logger.info(`User logged in with uuid ${user.uuid}.`)
    return {
      token,
      user,
    }
  }

  /**
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  loginByEthAddress = async ({
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
        await archivedCallback().catch((error) => logger.error)
      }
      throw new EthAddressNotFoundError(
        'Cannot find user with such ethAddress, login failed.'
      )
    }

    // no password; caller of this has verified eth signature
    // await this.verifyPassword({ password, hash: user.passwordHash })

    const token = jwt.sign({ id: user.id }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN_MS / 1000,
    })

    logger.info(
      `User logged in with uuid ${user.uuid} ethAddress ${ethAddress}.`
    )
    return {
      token,
      user,
    }
  }

  changePassword = async ({
    userId,
    password,
    type = GQLResetPasswordType.account,
  }: {
    userId: string
    password: string
    type?: GQLResetPasswordType
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

  /**
   * Find users by a given email.
   */
  findByEmail = async (
    email: string
  ): Promise<{ uuid: string; [key: string]: string }> =>
    this.knex.select().from(this.table).where({ email }).first()

  /**
   * Find users by a given user name.
   */
  findByUserName = async (userName: string) =>
    this.knex.select().from(this.table).where({ userName }).first()

  /**
   * Find users by a ether address.
   */
  findByEthAddress = async (ethAddress: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({
        ethAddress: ethAddress.toLowerCase(), // ethAddress case insensitive
      })
      .first()

  /**
   * Find user by liker id
   */
  findByLikerId = async (likerId: string) =>
    this.knex
      .select()
      .from(this.table)
      .where({
        likerId: likerId.toLowerCase(),
      })
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
   * Check if user name exists.
   */
  checkUserNameExists = async (userName: string) => {
    const result = await this.knex(this.table)
      .countDistinct('id')
      .where({ userName })
      .first()
    const count = parseInt(result ? (result.count as string) : '0', 10)
    return count > 0
  }

  /**
   * Programatically generate user name
   */
  generateUserName = async (email: string) => {
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

  /**
   * Archive User by a given user id
   */
  archive = async (id: string) => {
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

    // update search
    try {
      await this.es.client.update({
        index: this.table,
        id,
        body: {
          doc: { state: USER_STATE.archived },
        },
      })
    } catch (e) {
      logger.error(e)
    }

    return archivedUser
  }

  /**
   * Find activatable users
   */
  findActivatableUsers = () =>
    this.knex
      .select('user.*', 'total', 'read_count')
      .from(this.table)
      .innerJoin(
        'user_oauth_likecoin',
        'user_oauth_likecoin.liker_id',
        'user.liker_id'
      )
      .leftJoin(
        this.knex
          .select('recipient_id')
          .sum('amount as total')
          .from('appreciation')
          .groupBy('recipient_id')
          .as('tx'),
        'tx.recipient_id',
        'user.id'
      )
      .leftJoin(
        this.knex
          .select('user_id')
          .countDistinct('article_id as read_count')
          .from('article_read_count')
          .groupBy('user_id')
          .as('read'),
        'read.user_id',
        'user.id'
      )
      .where({
        state: USER_STATE.onboarding,
        accountType: 'general',
      })
      .andWhere(
        this.knex.raw(
          '2 * COALESCE("total", 0) + COALESCE("read_count", 0) >= 10'
        )
      )

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
      items: users.map((user) => ({
        ...user,
      })),
    })
  }

  addToSearch = async ({
    id,
    userName,
    displayName,
    description,
  }: {
    [key: string]: string
  }) => {
    try {
      return await this.es.indexItems({
        index: this.table,
        items: [
          {
            id,
            userName,
            displayName,
            description,
          },
        ],
      })
    } catch (error) {
      logger.error(error)
    }
  }

  // the searchV0: TBDeprecated in next release
  search = async ({
    key,
    take,
    skip,
    oss = false,
    filter,
    exclude,
    viewerId,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    oss?: boolean
    filter?: Record<string, any>
    viewerId?: string | null
    exclude?: GQLSearchExclude
  }) => {
    const body = bodybuilder()
      .from(skip)
      .size(take)
      .query('match', 'displayName.raw', key)
      .filter('term', 'state', USER_STATE.active)
      .build() as { [key: string]: any }

    body.suggest = {
      userName: {
        prefix: key,
        completion: {
          field: 'userName',
          fuzzy: {
            fuzziness: 0,
          },
          size: take,
        },
      },
      displayName: {
        prefix: key,
        completion: {
          field: 'displayName',
          fuzzy: {
            fuzziness: 0,
          },
          size: take,
        },
      },
    }

    try {
      const result = await this.es.client.search({
        index: this.table,
        body,
      })

      const { hits, suggest } = result as typeof result & {
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
      let ids = [...new Set([...userNameIds, ...displayNameIds, ...matchIds])]

      // filter out users who blocked viewer
      if (exclude === GQLSearchExclude.blocked && viewerId) {
        const blockedIds = (
          await this.knex('action_user')
            .select('user_id')
            .where({ action: USER_ACTION.block, targetId: viewerId })
        ).map(({ userId }) => userId)

        ids = _.difference(ids, blockedIds)
      }
      const nodes = await this.baseFindByIds(ids)
      return { nodes, totalCount: nodes.length }
    } catch (err) {
      logger.error(err)
      throw new ServerError('search failed')
    }
  }

  searchV1 = async ({
    key,
    take,
    skip,
    oss = false,
    filter,
    exclude,
    viewerId,
  }: {
    key: string
    author?: string
    take: number
    skip: number
    oss?: boolean
    filter?: Record<string, any>
    viewerId?: string | null
    exclude?: GQLSearchExclude
  }) => {
    const displayName = key
    const userName =
      key.startsWith('@') || key.startsWith('＠') ? key.slice(1) : key

    if (!userName) {
      return { nodes: [], totalCount: 0 }
    }

    const baseQuery = this.knex('search_index.user')
      .select('id')
      .whereLike('display_name', `%${displayName}%`)
      .orWhereLike('user_name', `%${userName}%`)
      .orderByRaw('display_name = ? DESC', [displayName])
      .orderByRaw('user_name = ? DESC', [userName])
      .orderByRaw('display_name ~ ? DESC', [displayName])
      .orderByRaw('num_followers DESC NULLS LAST')

    let query
    if (exclude === GQLSearchExclude.blocked && viewerId) {
      query = this.knex
        .select(
          this.knex.raw('result.id, count(result.id) OVER() AS total_count')
        )
        .from(baseQuery.as('result'))
        .whereNotIn(
          'result.id',
          this.knex('action_user')
            .select('user_id')
            .where({ action: USER_ACTION.block, targetId: viewerId })
        )
    } else {
      query = this.knex
        .select(
          this.knex.raw('result.id, count(result.id) OVER() AS total_count')
        )
        .from(baseQuery.as('result'))
    }
    query.modify((builder: Knex.QueryBuilder) => {
      if (skip !== undefined && Number.isFinite(skip)) {
        builder.offset(skip)
      }
      if (take !== undefined && Number.isFinite(take)) {
        builder.limit(take)
      }
    })

    const records = await query
    const totalCount = records.length === 0 ? 0 : +records[0].totalCount
    const nodes = await this.baseFindByIds(records.map(({ id }) => id))
    return { nodes, totalCount }
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
   *        Appreciation           *
   *                               *
   *********************************/
  totalRecived = async (recipientId: string) => {
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

  totalRecivedAppreciationCount = async (recipientId: string) => {
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

  totalSentAppreciationCount = async (senderId: string) => {
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

  totalSent = async (senderId: string) => {
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

  findAppreciationBySender = async ({
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

  findAppreciationByRecipient = async ({
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
  follow = async (userId: string, targetId: string) => {
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

  unfollow = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.follow,
      })
      .del()

  countFollowees = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({
        userId,
        action: USER_ACTION.follow,
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

  findFollowees = async ({
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

  findFollowers = async ({
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
  findCircleRecipients = async (circleId: string) => {
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

  isFollowing = async ({
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
  block = async (userId: string, targetId: string) => {
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

  unblock = async (userId: string, targetId: string) =>
    this.knex
      .from('action_user')
      .where({
        targetId,
        userId,
        action: USER_ACTION.block,
      })
      .del()

  blocked = async ({
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

  countBlockList = async (userId: string) => {
    const result = await this.knex('action_user')
      .where({ userId, action: USER_ACTION.block })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findBlockList = async ({
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
  countAuthor = async ({
    notIn = [],
    oss = false,
    type = GQLAuthorsType.default,
  }: {
    notIn?: string[]
    oss?: boolean
    type: GQLAuthorsType
  }) => {
    switch (type) {
      case GQLAuthorsType.default: {
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
      case GQLAuthorsType.active:
      case GQLAuthorsType.appreciated:
      case GQLAuthorsType.trendy: {
        const view =
          type === GQLAuthorsType.active
            ? 'most_active_author_materialized'
            : type === GQLAuthorsType.appreciated
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

  recommendAuthor = async ({
    take,
    skip,
    notIn = [],
    oss = false,
    type = GQLAuthorsType.default,
  }: {
    take?: number
    skip?: number
    notIn?: string[]
    oss?: boolean
    type?: GQLAuthorsType
  }) => {
    switch (type) {
      case GQLAuthorsType.default: {
        const table = oss
          ? VIEW.user_reader_view
          : MATERIALIZED_VIEW.user_reader_materialized
        const query = this.knex(table)
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
      case GQLAuthorsType.active:
      case GQLAuthorsType.appreciated:
      case GQLAuthorsType.trendy: {
        const view =
          type === GQLAuthorsType.active
            ? 'most_active_author_materialized'
            : type === GQLAuthorsType.appreciated
            ? 'most_appreciated_author_materialized'
            : 'most_trendy_author_materialized'

        const query = this.knex
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
      table: 'user_boost',
    })

  findScore = async (userId: string) => {
    const author = await this.knex('user_reader_view')
      .select()
      .where({ id: userId })
      .first()
    return author.authorScore || 0
  }

  recommendTags = ({ skip, take }: { skip: number; take: number }) =>
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

  countRecommendTags = async () => {
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
  findNotifySetting = async (userId: string): Promise<any | null> =>
    this.knex.select().from('user_notify_setting').where({ userId }).first()

  updateNotifySetting = async (
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
  countSubscription = async (userId: string) => {
    const result = await this.knex('action_article')
      .where({ userId, action: USER_ACTION.subscribe })
      .count()
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findSubscriptions = async ({
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
  countReadHistory = async (userId: string) => {
    const result = await this.knex('article_read_count')
      .where({ userId, archived: false })
      .countDistinct('article_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findReadHistory = async ({
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

  clearReadHistory = async ({
    articleId,
    userId,
  }: {
    articleId: string
    userId: string | null
  }) =>
    this.knex('article_read_count')
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

  findVerificationCodes = async ({
    where,
  }: {
    where?: {
      type?: GQLVerificationCodeType
      status?: VERIFICATION_CODE_STATUS
      [key: string]: any
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

  markVerificationCodeAs = ({
    codeId,
    status,
  }: {
    codeId: string
    status: VERIFICATION_CODE_STATUS
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
   *           Donation            *
   *                               *
   *********************************/
  /**
   * Count times of donation received by user
   */
  countReceivedDonation = async (recipientId: string) => {
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
  countDonatedArticle = async (senderId: string) => {
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
  countDonators = async (
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
  topDonators = async (
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
  findLiker = async ({
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

  saveLiker = async ({
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
  claimLikerId = async ({
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
  transferLikerId = async ({
    fromLiker,
    toLiker,
  }: {
    fromLiker: UserOAuthLikeCoin
    toLiker: Pick<UserOAuthLikeCoin, 'likerId' | 'accessToken'>
  }) => {
    return this.likecoin.edit({
      action: 'transfer',
      payload: {
        fromUserToken: fromLiker.accessToken,
        toUserToken: toLiker.accessToken,
      },
    })
  }

  // Update the platform ID <-> LikerID binding
  bindLikerId = async ({
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

  findOAuthToken = async ({
    userId,
    provider,
  }: {
    userId: string
    provider: string
  }) =>
    this.knex.select('*').from('user_oauth').where({ userId, provider }).first()

  saveOAuth = async ({
    userId,
    provider,
    accessToken,
    refreshToken,
    expires,
    scope,
    createdAt,
  }: {
    userId: string
    provider: string
    accessToken: string
    refreshToken: string
    expires: number
    scope: string
    createdAt?: Date
  }) => {
    await this.baseUpdateOrCreate({
      where: { userId, provider },
      data: {
        userId,
        provider,
        accessToken,
        refreshToken,
        expires,
        scope,
        ...(createdAt ? { createdAt } : { updatedAt: new Date() }),
      },
      table: 'user_oauth',
    })
  }

  /*********************************
   *                               *
   *             Punish            *
   *                               *
   *********************************/
  findPunishRecordsByTime = ({
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

  archivePunishRecordsByUserId = ({
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

  findOrCreateIPNSKey = async (userName: string) => {
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
   *            Misc               *
   *                               *
   *********************************/
  updateLastSeen = async (id: string, threshold = HOUR) => {
    const cacheService = new CacheService(CACHE_PREFIX.USER_LAST_SEEN)
    const { lastSeen } = (await cacheService.getObject({
      keys: { id },
      getter: async () =>
        this.knex(this.table).select('last_seen').where({ id }).first(),
      expire: Math.ceil(threshold / 1000),
    })) as any
    const last = new Date(lastSeen)
    const now = new Date()
    const delta = +now - +last
    if (delta > threshold) {
      await this.knex(this.table).update('last_seen', now).where({ id })
    }
  }
}

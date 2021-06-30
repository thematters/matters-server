import { compare } from 'bcrypt'
import bodybuilder from 'bodybuilder'
import DataLoader from 'dataloader'
import jwt from 'jsonwebtoken'
import _ from 'lodash'
import { nanoid } from 'nanoid'
import { v4 } from 'uuid'

import {
  APPRECIATION_PURPOSE,
  ARTICLE_STATE,
  BATCH_SIZE,
  COMMENT_STATE,
  MATERIALIZED_VIEW,
  SEARCH_KEY_TRUNCATE_LENGTH,
  TRANSACTION_PURPOSE,
  TRANSACTION_STATE,
  TRANSACTION_TARGET_TYPE,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
  USER_ACTION,
  USER_STATE,
  VERIFICATION_CODE_EXIPRED_AFTER,
  VERIFICATION_CODE_STATUS,
  VERIFICATION_CODE_TYPES,
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  PasswordInvalidError,
  ServerError,
} from 'common/errors'
import logger from 'common/logger'
import { generatePasswordhash } from 'common/utils'
import { BaseService, OAuthService } from 'connectors'
import {
  GQLAuthorsType,
  GQLResetPasswordType,
  GQLSearchExclude,
  GQLSearchInput,
  ItemData,
  UserOAuthLikeCoin,
  UserOAuthLikeCoinAccountType,
} from 'definitions'

import { likecoin } from './likecoin'
import { medium } from './medium'

export class UserService extends BaseService {
  likecoin: typeof likecoin
  medium: typeof medium

  constructor() {
    super('user')

    this.likecoin = likecoin
    this.medium = medium
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
    password,
  }: {
    email: string
    userName: string
    displayName: string
    description?: string
    password: string
  }) => {
    const avatar = null

    const uuid = v4()
    const passwordHash = await generatePasswordhash(password)
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
      state: USER_STATE.onboarding,
    })
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')

    await this.addToSearch(user)

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
  login = async ({
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

    await this.verifyPassword({ password, hash: user.passwordHash })

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn: USER_ACCESS_TOKEN_EXPIRES_IN_MS / 1000,
    })

    logger.info(`User logged in with uuid ${user.uuid}.`)
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

  search = async ({
    key,
    first = 20,
    offset,
    oss = false,
    exclude,
    viewerId,
  }: GQLSearchInput & {
    offset: number
    oss?: boolean
    viewerId?: string | null
  }) => {
    const body = bodybuilder()
      .from(offset)
      .size(first)
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
          size: first,
        },
      },
      displayName: {
        prefix: key,
        completion: {
          field: 'displayName',
          fuzzy: {
            fuzziness: 0,
          },
          size: first,
        },
      },
    }

    try {
      const result = await this.es.client.search({
        index: this.table,
        body,
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
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    senderId: string
    limit?: number
    offset?: number
  }) =>
    this.knex('appreciation')
      .where({
        senderId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .limit(limit)
      .offset(offset)
      .orderBy('id', 'desc')

  findAppreciationByRecipient = async ({
    recipientId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    recipientId: string
    limit?: number
    offset?: number
  }) =>
    this.knex('appreciation')
      .where({
        recipientId,
      })
      .whereNot({
        purpose: APPRECIATION_PURPOSE.superlike,
      })
      .limit(limit)
      .offset(offset)
      .orderBy('id', 'desc')

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

  makeFolloweeWorksQuery = ({
    fields = '*',
    state,
    userId,
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
    userId,
  }: {
    cursorId: string
    state: string
    userId: string
  }) => {
    const query = this.makeFolloweeWorksQuery({ fields: 'seq', state, userId })
    return query.where({ id: cursorId }).first()
  }

  followeeArticles = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE,
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

  /**
   * Find followee comments based on action_user table records. If one followee made
   * multiple comments in one article, only returns the latest one.
   *
   */
  followeeComments = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    userId: string
    offset?: number
    limit?: number
  }) =>
    this.knex
      .select('source.*')
      .from((operator: any) => {
        operator
          .max({ id: 'comment.id', created_at: 'comment.created_at' })
          .from('action_user as au')
          .join('comment', 'comment.author_id', 'au.target_id')
          .where({
            action: 'follow',
            userId,
            'comment.state': COMMENT_STATE.active,
          })
          .groupBy('article_id', 'author_id')
          .as('source')
      })
      .orderBy('source.created_at', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Count followee comments based on action_user table records. If one followee made
   * multiple comments in one article, only count as one.
   *
   */
  countFolloweeComments = async (userId: string) => {
    const result = await this.knex
      .from((operator: any) => {
        operator
          .max({ id: 'comment.id', created_at: 'comment.created_at' })
          .from('action_user as au')
          .join('comment', 'comment.author_id', 'au.target_id')
          .where({
            action: 'follow',
            userId,
            'comment.state': COMMENT_STATE.active,
          })
          .groupBy('article_id', 'author_id')
          .as('source')
      })
      .countDistinct('source.id')
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find deduped followee donations by a given entity type.
   *
   */
  findDedupedFolloweeDonationsByEntity = async ({
    id,
    limit = BATCH_SIZE,
    after,
    type,
  }: {
    id: string
    limit?: number
    after?: number
    type: TRANSACTION_TARGET_TYPE
  }) => {
    const query = this.knex
      .select('*')
      .from((knex: any) => {
        const source = knex
          .max('tx.id as id')
          .select('tx.target_id as article_id')
          .from('action_user as au')
          .innerJoin('transaction as tx', 'tx.sender_id', 'au.target_id')
          .where({
            'au.user_id': id,
            'au.action': USER_ACTION.follow,
            'tx.purpose': TRANSACTION_PURPOSE.donation,
            'tx.state': TRANSACTION_STATE.succeeded,
            'tx.target_type': type,
          })
          .groupBy('article_id')
          .orderBy('id', 'desc')
          .as('source')
        return source
      })
      .limit(limit)

    if (after) {
      query.andWhere('id', '<', after)
    }
    return query
  }

  /**
   * Count deduped followee donation by a given entity type.
   *
   */
  countDedupedFolloweeDonationsByEntity = async ({
    id,
    type,
  }: {
    id: string
    type: TRANSACTION_TARGET_TYPE
  }) => {
    const result = await this.knex
      .count('id')
      .from((knex: any) => {
        const source = knex
          .max('tx.id as id')
          .select('tx.target_id as article_id')
          .from('action_user as au')
          .innerJoin('transaction as tx', 'tx.sender_id', 'au.target_id')
          .where({
            'au.user_id': id,
            'au.action': USER_ACTION.follow,
            'tx.purpose': TRANSACTION_PURPOSE.donation,
            'tx.state': TRANSACTION_STATE.succeeded,
            'tx.target_type': type,
          })
          .groupBy('article_id')
          .as('source')
        return source
      })
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find tags based on action_tag table records.
   *
   */
  findFollowingTags = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    userId: string
    offset?: number
    limit?: number
  }) =>
    this.knex('action_tag')
      .select('target_id')
      .where({ userId })
      .offset(offset)
      .limit(limit)

  /**
   * Count tags based on action_tag table records.
   *
   */
  countFollowingTags = async (userId: string) => {
    const result = await this.knex('action_tag')
      .where({ userId })
      .count()
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  /**
   * Find tags articles based on action_tag table records.
   *
   */
  findFollowingTagsArticles = async ({
    userId,
    offset = 0,
    limit = BATCH_SIZE,
  }: {
    userId: string
    offset?: number
    limit?: number
  }) =>
    this.knex
      .select('article_tag.article_id')
      .max('article_tag.created_at as created_at')
      .from('action_tag')
      .innerJoin('article_tag', 'article_tag.tag_id', 'action_tag.target_id')
      .where({ userId })
      .groupBy('article_tag.article_id')
      .orderBy('created_at', 'desc')
      .offset(offset)
      .limit(limit)

  /**
   * Count tags articles based on action_tag table records.
   *
   */
  countFollowingTagsArticles = async (userId: string) => {
    const result = await this.knex
      .from('action_tag')
      .innerJoin('article_tag', 'article_tag.tag_id', 'action_tag.target_id')
      .where({ userId })
      .countDistinct('article_tag.article_id')
      .first()

    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findFollowees = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0,
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
    after,
  }: {
    targetId: string
    limit?: number
    after?: number
  }) => {
    const query = this.knex
      .select()
      .from('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .orderBy('id', 'desc')
      .limit(limit)

    if (after) {
      query.andWhere('id', '<', after)
    }
    return query
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
    limit = BATCH_SIZE,
    offset = 0,
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
    platform = 'web',
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
      platform: platform || 'web',
    }
    return this.baseUpdateOrCreate({
      where: data,
      data: { updatedAt: new Date(), ...data },
      table: 'push_device',
    })
  }

  unsubscribePush = async ({
    userId,
    deviceId,
  }: {
    userId: string
    deviceId: string
  }) =>
    this.knex
      .from('push_device')
      .where({
        deviceId,
        userId,
      })
      .del()

  findPushDevice = async ({
    userId,
    deviceId,
  }: {
    userId: string
    deviceId: string
  }) =>
    this.knex
      .from('push_device')
      .where({
        deviceId,
        userId,
      })
      .first()

  findPushDevices = async ({ userIds }: { userIds: string[] }) =>
    this.knex.from('push_device').whereIn('userId', userIds)

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
          ? 'user_reader_view'
          : MATERIALIZED_VIEW.userReaderMaterialized
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
    return 0
  }

  recommendAuthor = async ({
    limit = BATCH_SIZE,
    offset = 0,
    notIn = [],
    oss = false,
    type = GQLAuthorsType.default,
  }: {
    limit?: number
    offset?: number
    notIn?: string[]
    oss?: boolean
    type?: GQLAuthorsType
  }) => {
    switch (type) {
      case GQLAuthorsType.default: {
        const table = oss
          ? 'user_reader_view'
          : MATERIALIZED_VIEW.userReaderMaterialized
        const result = await this.knex(table)
          .select()
          .orderByRaw('author_score DESC NULLS LAST')
          .orderBy('id', 'desc')
          .offset(offset)
          .limit(limit)
          .where({ state: USER_STATE.active })
          .whereNotIn('id', notIn)
        return result
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
          .select()
          .from({ view })
          .innerJoin('user', 'view.id', 'user.id')
          .offset(offset)
          .limit(limit)
          .where({ state: USER_STATE.active })
          .whereNotIn('view.id', notIn)
        return result
      }
    }
    return []
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

  recommendItems = async ({
    userId,
    itemIndex,
    first = 20,
    offset = 0,
    notIn = [],
  }: {
    userId: string
    itemIndex: string
    first?: number
    offset?: number
    notIn?: string[]
  }) => {
    // get user vector score
    const scoreResult = await this.es.client.get({
      index: this.table,
      id: userId,
    })

    const factors = _.get(scoreResult.body, '_source.embedding_vector')

    if (!factors) {
      return []
    }

    const searchBody = bodybuilder()
      .query('script_score', {
        query: {
          bool: {
            must: [
              {
                exists: {
                  field: 'embedding_vector',
                },
              },
            ],
          },
        },
        script: {
          source:
            "cosineSimilarity(params.query_vector, 'embedding_vector') + 1.0",
          params: {
            query_vector: factors,
          },
        },
      })
      .filter('term', { state: ARTICLE_STATE.active })
      .notFilter('ids', { values: notIn })
      .from(offset)
      .size(first)
      .build()

    const { body } = await this.es.client.search({
      index: itemIndex,
      body: searchBody,
    })
    // add recommendation
    return body.hits.hits.map((hit: any) => ({ ...hit, id: hit._id }))
  }

  recommendTags = ({ limit = 5, offset = 0 }) =>
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
      .offset(offset)
      .limit(limit)

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
    limit = BATCH_SIZE,
    offset = 0,
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
    const result = await this.knex('article_read_count')
      .where({ userId, archived: false })
      .countDistinct('article_id')
      .first()
    return parseInt(result ? (result.count as string) : '0', 10)
  }

  findReadHistory = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    userId: string
    limit?: number
    offset?: number
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
      .limit(limit)
      .offset(offset)

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
    const code = strong ? nanoid(40) : _.random(100000, 999999)

    return this.baseCreate(
      {
        uuid: v4(),
        userId,
        email,
        type,
        code,
        expiredAt:
          expiredAt || new Date(Date.now() + VERIFICATION_CODE_EXIPRED_AFTER),
      },
      'verification_code'
    )
  }

  findVerificationCodes = async ({
    where,
  }: {
    where?: {
      type?: keyof typeof VERIFICATION_CODE_TYPES
      status?: keyof typeof VERIFICATION_CODE_STATUS
      [key: string]: any
    }
  }) => {
    let qs = this.knex.select().from('verification_code').orderBy('id', 'desc')

    if (where) {
      qs = qs.where(where)
    }

    return qs
  }

  markVerificationCodeAs = ({
    codeId,
    status,
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
}

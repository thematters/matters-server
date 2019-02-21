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
  ARTICLE_STATE
} from 'common/enums'
import { environment } from 'common/environment'
import {
  EmailNotFoundError,
  PasswordInvalidError,
  ServerError
} from 'common/errors'
import { ItemData, GQLSearchInput, GQLUpdateUserInfoInput } from 'definitions'

import { BaseService } from './baseService'
import { ConfigurationServicePlaceholders } from 'aws-sdk/lib/config_service_placeholders'

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
      passwordHash
    })
    await this.baseCreate({ userId: user.id }, 'user_notify_setting')
    await this.activateInvitedEmailUser({
      userId: user.id,
      email
    })

    await this.addToSearch(user)

    return user
  }

  /**
   * Login user and return jwt token. Default to expires in 24 * 90 hours
   */
  login = async ({
    email,
    password,
    expiresIn = 86400 * 90
  }: {
    email: string
    password: string
    expiresIn?: number
  }) => {
    const user = await this.findByEmail(email)

    if (!user) {
      throw new EmailNotFoundError('Cannot find user with email, login failed.')
    }

    const auth = await compare(password, user.passwordHash)
    if (!auth) {
      throw new PasswordInvalidError('Password incorrect, login failed.')
    }

    const token = jwt.sign({ uuid: user.uuid }, environment.jwtSecret, {
      expiresIn
    })

    logger.info(`User logged in with uuid ${user.uuid}.`)
    return {
      expiresIn,
      token,
      user
    }
  }

  updateInfo = async (
    id: string,
    input: GQLUpdateUserInfoInput & { email?: string; emailVerified?: boolean }
  ) => {
    const user = await this.baseUpdate(id, { updatedAt: new Date(), ...input })

    const { description, displayName, userName } = input
    if (!description && !displayName && !userName) {
      return user
    }

    // remove null and undefined
    const searchable = _.pickBy(
      { description, displayName, userName },
      _.identity
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
    return parseInt(result.count, 10)
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

  search = async ({ key }: GQLSearchInput) => {
    const body = bodybuilder()
      .query('multi_match', {
        query: key,
        fields: ['displayName^5', 'userName^10', 'description']
      })
      .size(100)
      .build()

    try {
      const { hits } = await this.es.client.search({
        index: this.table,
        type: this.table,
        body
      })
      const ids = hits.hits.map(({ _id }) => _id)
      return this.baseFindByIds(ids)
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
    return result.map(({ searchKey }: { searchKey: string }) => searchKey)
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
    return parseInt(result.count, 10)
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
    return parseInt(result.count, 10)
  }

  countFollowers = async (targetId: string): Promise<number> => {
    const result = await this.knex('action_user')
      .where({ targetId, action: USER_ACTION.follow })
      .count()
      .first()
    return parseInt(result.count, 10)
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
      .where({ action: 'follow', userId })
      .orderBy('ar.created_at', 'desc')
      .offset(offset)
      .limit(limit)

  countFolloweeArticles = async (userId: string) => {
    const result = await this.knex('action_user as au')
      .join('article as ar', 'ar.author_id', 'au.target_id')
      .where({ action: 'follow', userId })
      .countDistinct('ar.id')
      .first()
    return parseInt(result.count, 10)
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
    return parseInt(result.count, 10)
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
    return parseInt(result.count || 0, 10)
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
          .min('read.created_at as read_at')
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

  /*********************************
   *                               *
   *           Invitation          *
   *                               *
   *********************************/
  /**
   * Find invitation by email
   */
  findInvitationByEmail = async (email: string) =>
    await this.knex
      .select()
      .from('invitation')
      .where({ email })
      .first()

  /**
   * Find invitations
   */
  findInvitations = async (userId: string): Promise<any[]> =>
    await this.knex
      .select()
      .from('invitation')
      .where({ senderId: userId })
      .orderBy('id', 'desc')

  /**
   * count invitations
   */
  countInvitation = async (userId: string) => {
    const result = await this.knex('invitation')
      .select()
      .where({ senderId: userId })
      .count()
      .first()
    return parseInt(result.count, 10)
  }

  /**
   * Find invitation by id
   */
  findInvitation = async (id: string) => {
    const result = await this.knex('invitation')
      .select()
      .where({ id })
      .first()
    return result
  }
  /**
   * Activate user
   */
  activate = async ({
    senderId,
    recipientId
  }: {
    senderId?: string
    recipientId: string
  }): Promise<any> => {
    await this.knex.transaction(async trx => {
      // set recipient's state to "active"
      await trx
        .where({ id: recipientId })
        .update({ state: USER_STATE.active })
        .into(this.table)
        .returning('*')
      // add invitation record
      const { id: invitationId } = await trx
        .insert({ senderId, recipientId, status: INVITATION_STATUS.activated })
        .into('invitation')
        .returning('*')
      // add transaction record
      await trx
        .insert({
          uuid: v4(),
          recipientId,
          referenceId: invitationId,
          purpose: TRANSACTION_PURPOSE.joinByInvitation,
          amount: MAT_UNIT.joinByInvitation
        })
        .into('transaction')
        .returning('*')
      await trx
        .insert({
          uuid: v4(),
          recipientId: senderId,
          referenceId: invitationId,
          purpose: TRANSACTION_PURPOSE.invitationAccepted,
          amount: MAT_UNIT.invitationAccepted
        })
        .into('transaction')
        .returning('*')
    })
  }

  /**
   * Invite email
   */
  invite = async ({
    senderId,
    email
  }: {
    senderId?: string
    email: string
  }): Promise<any> =>
    await this.baseCreate(
      { senderId, email, status: INVITATION_STATUS.pending },
      'invitation'
    )

  /**
   * Activate new user of invited email
   */
  activateInvitedEmailUser = async ({
    userId,
    email
  }: {
    userId: string
    email: string
  }) => {
    try {
      const invitation = await this.findInvitationByEmail(email)

      if (!invitation) {
        return
      }

      const sender =
        invitation.senderId && (await this.dataloader.load(invitation.senderId))
      await this.knex.transaction(async trx => {
        // set recipient's state to "active"
        await trx
          .where({ id: userId })
          .update({ state: USER_STATE.active })
          .into(this.table)
          .returning('*')
        // add transaction record
        await trx
          .insert({
            uuid: v4(),
            recipientId: userId,
            referenceId: invitation.id,
            purpose: TRANSACTION_PURPOSE.joinByInvitation,
            amount: MAT_UNIT.joinByInvitation
          })
          .into('transaction')
          .returning('*')
        if (sender) {
          await trx
            .insert({
              uuid: v4(),
              recipientId: sender.id,
              referenceId: invitation.id,
              purpose: TRANSACTION_PURPOSE.invitationAccepted,
              amount: MAT_UNIT.invitationAccepted
            })
            .into('transaction')
            .returning('*')
        }
      })

      // update "recipientId" of invitation
      await this.baseUpdate(
        invitation.id,
        { recipientId: userId },
        'invitation'
      )
    } catch (e) {
      logger.error('[activateInvitedEmailUser]', e)
    }
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
}

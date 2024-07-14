import type {
  Notice as NoticeDB,
  NoticeData,
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeEntity,
  NoticeItem,
  NoticeUserId,
  NotificationEntity,
  NotificationType,
  PutNoticeParams,
  User,
  Connections,
  UserNotifySetting,
  LANGUAGES,
  NotificationParams,
} from 'definitions'

import { isArray, isEqual, mergeWith, uniq } from 'lodash'
import { v4 } from 'uuid'

import {
  BUNDLED_NOTICE_TYPE,
  NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  MONTH,
} from 'common/enums'
import { getLogger } from 'common/logger'
import {
  BaseService,
  AtomService,
  ArticleService,
  UserService,
} from 'connectors'

import trans from './translations'

const logger = getLogger('service:notice')

const mergeDataCustomizer = (objValue: any, srcValue: any) => {
  if (isArray(objValue)) {
    return uniq(objValue.concat(srcValue))
  }
}

const mergeDataWith = (objValue: any, srcValue: any) =>
  mergeWith(objValue, srcValue, mergeDataCustomizer)

export class Notice extends BaseService<NoticeDB> {
  public constructor(connections: Connections) {
    super('notice', connections)
  }

  /**
   * Create a notice item
   */
  public async create({
    type,
    actorId,
    recipientId,
    entities,
    message,
    data,
  }: PutNoticeParams): Promise<void> {
    await this.knex.transaction(async (trx) => {
      // create notice detail
      const [{ id: noticeDetailId }] = await trx
        .insert({
          noticeType: type,
          message,
          data,
        })
        .into('notice_detail')
        .returning('*')

      // create notice
      const [{ id: noticeId }] = await trx
        .insert({
          uuid: v4(),
          noticeDetailId,
          recipientId,
        })
        .into('notice')
        .returning('*')

      // create notice actorId
      if (actorId) {
        await trx
          .insert({
            noticeId,
            actorId,
          })
          .into('notice_actor')
          .returning('*')
      }

      // create notice entities
      if (entities) {
        await Promise.all(
          entities.map(
            async ({
              type: entityType,
              entityTable,
              entity,
            }: NotificationEntity) => {
              const { id: entityTypeId } = await trx
                .select('id')
                .from('entity_type')
                .where({ table: entityTable })
                .first()
              await trx
                .insert({
                  type: entityType,
                  entityTypeId,
                  entityId: entity.id,
                  noticeId,
                })
                .into('notice_entity')
                .returning('*')
            }
          )
        )
      }
    })
  }

  public async trigger(params: NotificationParams) {
    const atomService = new AtomService(this.connections)
    const userService = new UserService(this.connections)
    const recipient = await atomService.userIdLoader.load(params.recipientId)

    if (!recipient) {
      logger.warn(`recipient ${params.recipientId} not found, skipped`)
      return
    }

    const noticeParams = await this.getNoticeParams(params, recipient.language)

    if (!noticeParams) {
      return
    }

    // skip if actor === recipient
    if ('actorId' in params && params.actorId === params.recipientId) {
      logger.warn(
        `Actor ${params.actorId} is same as recipient ${params.recipientId}, skipped`
      )
      return
    }

    // skip if user disable notify
    const notifySetting = await userService.findNotifySetting(recipient.id)
    const enable = await this.checkUserNotifySetting({
      event: params.event,
      setting: notifySetting as UserNotifySetting,
    })

    if (!enable) {
      logger.info(
        `Send ${noticeParams.type} to ${noticeParams.recipientId} skipped`
      )
      return
    }

    // skip if sender is blocked by recipient
    if ('actorId' in params && params.actorId) {
      const blocked = await userService.blocked({
        userId: recipient.id,
        targetId: params.actorId,
      })

      if (blocked) {
        logger.info(
          `Actor ${params.actorId} is blocked by recipient ${params.recipientId}, skipped`
        )
        return
      }
    }

    // Put Notice to DB
    const { created, bundled } = await this.process(noticeParams)

    if (!created && !bundled) {
      logger.info(`Notice ${params.event} to ${params.recipientId} skipped`)
      return
    }
  }

  /**
   * Bundle with existing notice
   */
  private async addNoticeActor({
    noticeId,
    actorId,
  }: {
    noticeId: string
    actorId: NoticeUserId
  }): Promise<void> {
    await this.knex.transaction(async (trx) => {
      // add actor
      await trx
        .insert({
          noticeId,
          actorId,
        })
        .into('notice_actor')
        .returning('*')
        .onConflict(['actor_id', 'notice_id'])
        .ignore()

      // update notice
      await trx('notice')
        .where({ id: noticeId })
        .update({ unread: true, updatedAt: this.knex.fn.now() })
      logger.info(`updated id %s in notice`, noticeId)
    })
  }

  /**
   * Update data of existing notice
   */
  private async updateNoticeData({
    noticeId,
    data,
  }: {
    noticeId: string
    data: NoticeData
  }) {
    return this.knex('notice_detail')
      .update({ data })
      .whereIn('id', function () {
        this.select('notice_detail_id').from('notice').where({ id: noticeId })
      })
  }

  /**
   * Process new event to determine
   * whether to bundle with old notice or create new notice or do nothing
   */
  private process = async (
    params: PutNoticeParams
  ): Promise<{ created: boolean; bundled: boolean }> => {
    if (params.bundle?.disabled === true) {
      await this.create(params)
      return { created: true, bundled: false }
    } else {
      const bundleables = await this.findBundleables(params)

      // bundle
      if (bundleables[0] && params.actorId && params.resend !== true) {
        await this.addNoticeActor({
          noticeId: bundleables[0].id,
          actorId: params.actorId,
        })

        if (params.bundle?.mergeData && params.data) {
          await this.updateNoticeData({
            noticeId: bundleables[0].id,
            data: mergeDataWith(bundleables[0].data, params.data),
          })
        }

        return { created: false, bundled: true }
      }

      // create new notice
      await this.create(params)
      return { created: true, bundled: false }
    }
  }

  /**
   * Find bundleable notices
   *
   */
  public findBundleables = async ({
    type,
    recipientId,
    entities,
    message = null,
    data = null,
    bundle: { mergeData } = { mergeData: false },
  }: PutNoticeParams): Promise<NoticeDetail[]> => {
    const notices = await this.findDetail({
      where: [
        [
          {
            noticeType: type,
            unread: true,
            deleted: false,
            recipientId,
            message,
          },
        ],
      ],
    })
    const bundleables: NoticeDetail[] = []

    // no notices have same details
    if (!notices || notices.length <= 0) {
      return bundleables
    }

    await Promise.all(
      notices.map(async (n) => {
        // skip if data isn't the same
        if (!isEqual(n.data, data) && !mergeData) {
          return
        }

        const targetEntities = (await this.findEntities(
          n.id,
          false
        )) as NoticeEntity[]

        // check entities' existence
        const isTargetEntitiesExists =
          targetEntities && targetEntities.length > 0
        const isSourceEntitiesExists = entities && entities.length > 0
        if (!isTargetEntitiesExists || !isSourceEntitiesExists) {
          bundleables.push(n)
          return
        }
        if (
          (isTargetEntitiesExists && !isSourceEntitiesExists) ||
          (!isTargetEntitiesExists && isSourceEntitiesExists)
        ) {
          return
        }

        // compare notice entities
        const targetEntitiesHashMap: any = {}
        const sourceEntitiesHashMap: any = {}
        const sourceEntities = entities || []
        targetEntities.forEach(({ type: targetType, table, entityId }) => {
          const hash = `${targetType}:${table}:${entityId}`
          targetEntitiesHashMap[hash] = true
        })
        sourceEntities.forEach(({ type: sourceType, entityTable, entity }) => {
          const hash = `${sourceType}:${entityTable}:${entity.id}`
          sourceEntitiesHashMap[hash] = true
        })

        if (isEqual(targetEntitiesHashMap, sourceEntitiesHashMap)) {
          bundleables.push(n)
          return
        }
      })
    )

    return bundleables
  }

  /**
   * Find notices with detail
   */
  private findDetail = async ({
    where,
    whereIn,
    skip,
    take,
  }: {
    where?: any[][]
    whereIn?: [string, any[]]
    skip?: number
    take?: number
  }): Promise<NoticeDetail[]> => {
    const query = this.knexRO
      .select([
        'notice.id',
        'notice.unread',
        'notice.deleted',
        'notice.updated_at',
        'notice_detail.notice_type',
        'notice_detail.message',
        'notice_detail.data',
      ])
      .from('notice')
      .innerJoin(
        'notice_detail',
        'notice.notice_detail_id',
        '=',
        'notice_detail.id'
      )
      .orderBy('updated_at', 'desc')
      .whereIn('notice_detail.notice_type', Object.values(NOTICE_TYPE))

    if (where) {
      where.forEach((w) => {
        query.where(w[0], w[1], w[2])
      })
    }

    if (whereIn) {
      query.whereIn(...whereIn)
    }

    if (skip) {
      query.offset(skip)
    }

    if (take || take === 0) {
      query.limit(take)
    }

    const result = await query

    return result
  }

  /**
   * Find notice entities by a given notice id
   */
  private findEntities = async (
    noticeId: string,
    expand = true
  ): Promise<NoticeEntity[] | NoticeEntitiesMap> => {
    const entities = await this.knex
      .select([
        'notice_entity.type',
        'notice_entity.entity_id',
        'entity_type.table',
      ])
      .from('notice_entity')
      .innerJoin(
        'entity_type',
        'entity_type.id',
        '=',
        'notice_entity.entity_type_id'
      )
      .where({ noticeId })

    if (expand) {
      const _entities = {} as any

      await Promise.all(
        entities.map(async ({ type, entityId, table }: any) => {
          const entity = await this.knex
            .select()
            .from(table)
            .where({ id: entityId })
            .first()

          _entities[type] = entity
        })
      )

      return _entities
    }

    return entities
  }

  /**
   * Find notice actors by a given notice id
   */
  public findActors = async (
    noticeId: string
  ): Promise<Array<User & { noticeActorCreatedAt: string }>> => {
    const actors = await this.knex
      .select('user.*', 'notice_actor.created_at as noticeActorCreatedAt')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
    return actors
  }

  /*********************************
   *                               *
   *           By User             *
   *                               *
   *********************************/
  public findByUser = async ({
    userId,
    onlyRecent,
    take,
    skip,
  }: {
    userId: string
    onlyRecent?: boolean
    take?: number
    skip?: number
  }): Promise<NoticeItem[]> => {
    const where = [[{ recipientId: userId, deleted: false }]] as any[][]
    if (onlyRecent) {
      where.push(['notice.updated_at', '>', new Date(Date.now() - 6 * MONTH)])
    }

    const notices = await this.findDetail({
      where,
      skip,
      take,
    })

    return Promise.all(
      notices.map(async (n: NoticeDetail) => {
        const entities = (await this.findEntities(n.id)) as NoticeEntitiesMap
        const actors = await this.findActors(n.id)

        return {
          ...n,
          createdAt: n.updatedAt,
          type: n.noticeType,
          actors,
          entities,
        }
      })
    )
  }

  public checkUserNotifySetting = async ({
    event,
    setting,
  }: {
    event: NotificationType
    setting: UserNotifySetting
  }) => {
    if (!setting) {
      return false
    }

    const noticeSettingMap: Record<NotificationType, boolean> = {
      // user
      user_new_follower: setting.userNewFollower,

      // article
      article_published: true,
      article_new_appreciation: setting.newLike,
      article_new_subscriber: setting.articleNewSubscription,
      article_mentioned_you: setting.mention,
      revised_article_published: true,
      revised_article_not_published: true,
      circle_new_article: setting.inCircleNewArticle,

      // article-article
      article_new_collected: setting.articleNewCollected,

      // moment
      moment_liked: setting.newLike,
      moment_mentioned_you: setting.mention,

      // comment

      article_comment_liked: setting.newLike,
      moment_comment_liked: setting.newLike,
      article_comment_mentioned_you: setting.mention,
      moment_comment_mentioned_you: setting.mention,
      article_new_comment: setting.newComment,
      moment_new_comment: setting.newComment,
      circle_new_broadcast: setting.inCircleNewBroadcast,

      // comment-comment
      comment_new_reply: setting.newComment,

      // transaction
      payment_received_donation: true,

      // circle
      circle_invitation: true,
      circle_new_subscriber: setting.circleNewSubscriber,
      circle_new_unsubscriber: setting.circleNewUnsubscriber,
      circle_new_follower: setting.circleNewFollower,

      // circle bundles
      circle_new_broadcast_comments: true, // only a placeholder
      circle_broadcast_mentioned_you: true,
      circle_member_new_broadcast_reply: setting.circleMemberNewBroadcastReply,
      in_circle_new_broadcast_reply: setting.inCircleNewBroadcastReply,

      circle_new_discussion_comments: true, // only a placeholder
      circle_discussion_mentioned_you: true,
      circle_member_new_discussion: setting.circleMemberNewDiscussion,
      circle_member_new_discussion_reply:
        setting.circleMemberNewDiscussionReply,
      in_circle_new_discussion: setting.inCircleNewDiscussion,
      in_circle_new_discussion_reply: setting.inCircleNewDiscussionReply,

      // system
      official_announcement: true,
      user_banned: true,
      user_banned_payment: true,
      user_frozen: true,
      user_unbanned: true,
      comment_banned: true,
      article_banned: true,
      comment_reported: true,
      article_reported: true,
    }

    return noticeSettingMap[event]
  }

  private getNoticeParams = async (
    params: NotificationParams,
    language: LANGUAGES
  ): Promise<PutNoticeParams | undefined> => {
    const articleService = new ArticleService(this.connections)
    switch (params.event) {
      // entity-free
      case NOTICE_TYPE.user_new_follower:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
        }
      // system as the actor
      case NOTICE_TYPE.article_published:
      case NOTICE_TYPE.revised_article_published:
      case NOTICE_TYPE.revised_article_not_published:
      case NOTICE_TYPE.circle_new_article: // deprecated
        return {
          type: params.event,
          recipientId: params.recipientId,
          entities: params.entities,
        }
      // single actor with one or more entities
      case NOTICE_TYPE.article_new_collected:
      case NOTICE_TYPE.article_new_appreciation:
      case NOTICE_TYPE.article_new_subscriber:
      case NOTICE_TYPE.article_mentioned_you:
      case NOTICE_TYPE.article_comment_mentioned_you:
      case NOTICE_TYPE.comment_new_reply:
      case NOTICE_TYPE.payment_received_donation:
      case NOTICE_TYPE.circle_new_broadcast: // deprecated
      case NOTICE_TYPE.circle_new_subscriber:
      case NOTICE_TYPE.circle_new_follower:
      case NOTICE_TYPE.circle_new_unsubscriber:
      case NOTICE_TYPE.moment_liked:
      case NOTICE_TYPE.moment_comment_liked:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
        }
      case NOTICE_TYPE.article_new_comment:
      case NOTICE_TYPE.article_comment_liked:
      case NOTICE_TYPE.moment_new_comment:
      case NOTICE_TYPE.moment_mentioned_you:
      case NOTICE_TYPE.moment_comment_mentioned_you:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
          bundle: { disabled: true },
        }
      case NOTICE_TYPE.circle_invitation:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
          resend: true,
        }
      // bundled: circle_new_broadcast_comments
      case BUNDLED_NOTICE_TYPE.circle_broadcast_mentioned_you:
      case BUNDLED_NOTICE_TYPE.circle_member_new_broadcast_reply:
      case BUNDLED_NOTICE_TYPE.in_circle_new_broadcast_reply:
        return {
          type: NOTICE_TYPE.circle_new_broadcast_comments,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
          data: params.data, // update latest comment to DB `data` field
          bundle: { mergeData: true },
        }
      // bundled: circle_new_discussion_comments
      case BUNDLED_NOTICE_TYPE.circle_discussion_mentioned_you:
      case BUNDLED_NOTICE_TYPE.circle_member_new_discussion:
      case BUNDLED_NOTICE_TYPE.circle_member_new_discussion_reply:
      case BUNDLED_NOTICE_TYPE.in_circle_new_discussion:
      case BUNDLED_NOTICE_TYPE.in_circle_new_discussion_reply:
        return {
          type: NOTICE_TYPE.circle_new_discussion_comments,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
          data: params.data, // update latest comment to DB `data` field
          bundle: { mergeData: true },
        }
      // act as official announcement
      case NOTICE_TYPE.official_announcement:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: params.message,
          data: params.data,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_banned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_banned(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_banned_payment:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_banned_payment(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_frozen:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_frozen(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_unbanned(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.comment_banned(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_banned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.article_banned(language, {
            title: (
              await articleService.loadLatestArticleVersion(
                params.entities[0].entity.id
              )
            ).title,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_reported:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.comment_reported(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_reported:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.article_reported(language, {
            title: (
              await articleService.loadLatestArticleVersion(
                params.entities[0].entity.id
              )
            ).title,
          }),
          entities: params.entities,
        }
      default:
        return
    }
  }

  public countNotice = async ({
    userId,
    unread,
    onlyRecent,
  }: {
    userId: string
    unread?: boolean
    onlyRecent?: boolean
  }) => {
    const query = this.knex('notice')
      .where({ recipientId: userId, deleted: false })
      .count()
      .first()

    if (unread) {
      query.where({ unread: true })
    }

    if (onlyRecent) {
      query.whereRaw(`updated_at > now() - interval '6 months'`)
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }
}

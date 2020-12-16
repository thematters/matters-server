import DataLoader from 'dataloader'
import { isEqual, uniqBy } from 'lodash'
import { v4 } from 'uuid'

import { BATCH_SIZE, DAY, DB_NOTICE_TYPES } from 'common/enums'
import logger from 'common/logger'
import { BaseService } from 'connectors'
import {
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeEntity,
  NoticeItem,
  NoticeUserId,
  NotificationEntity,
  NotificationType,
  PutNoticeParams,
  User,
} from 'definitions'

class Notice extends BaseService {
  constructor() {
    super('notice')
    this.dataloader = new DataLoader(this.findByIds)
  }

  /**
   * Create a notice item
   */
  async create({
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
      logger.info(`Inserted id ${noticeDetailId} to notice_detail`)

      // create notice
      const [{ id: noticeId }] = await trx
        .insert({
          uuid: v4(),
          noticeDetailId,
          recipientId,
        })
        .into('notice')
        .returning('*')
      logger.info(`Inserted id ${noticeId} to notice`)

      // create notice actorId
      if (actorId) {
        const [{ id: noticeActorId }] = await trx
          .insert({
            noticeId,
            actorId,
          })
          .into('notice_actor')
          .returning('*')
        logger.info(`Inserted id ${noticeActorId} to notice_actor`)
      }

      // craete notice entities
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
              const [{ id: noticeEntityId }] = await trx
                .insert({
                  type: entityType,
                  entityTypeId,
                  entityId: entity.id,
                  noticeId,
                })
                .into('notice_entity')
                .returning('*')
              logger.info(`Inserted id ${noticeEntityId} to notice_entity`)
            }
          )
        )
      }
    })
  }

  /**
   * Bundle with existing notice
   */
  async addNoticeActor({
    noticeId,
    actorId,
  }: {
    noticeId: string
    actorId: NoticeUserId
  }): Promise<void> {
    await this.knex.transaction(async (trx) => {
      // add actor
      const [{ id: noticeActorId }] = await trx
        .insert({
          noticeId,
          actorId,
        })
        .into('notice_actor')
        .returning('*')
      logger.info(
        `[addNoticeActor] Inserted id ${noticeActorId} to notice_actor`
      )

      // update notice
      await trx('notice')
        .where({ id: noticeId })
        .update({ unread: true, updatedAt: new Date() })
      logger.info(`[addNoticeActor] Updated id ${noticeId} in notice`)
    })
  }

  /**
   * Process new event to determine
   * whether to bundle with old notice or create new notice or do nothing
   */
  process = async (
    params: PutNoticeParams
  ): Promise<{ created: boolean; bundled: boolean }> => {
    const bundleables = await this.findBundleables(params)

    // bundle
    if (bundleables[0] && params.actorId) {
      await this.addNoticeActor({
        noticeId: bundleables[0].id,
        actorId: params.actorId,
      })
      return { created: false, bundled: true }
    }

    // create new notice
    await this.create(params)
    return { created: true, bundled: false }
  }

  /**
   * Find bundleable notices
   *
   */
  findBundleables = async ({
    type,
    recipientId,
    entities,
    message = null,
    data = null,
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
        if (!isEqual(n.data, data)) {
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
  findDetail = async ({
    where,
    whereIn,
    offset,
    limit,
  }: {
    where?: any[][]
    whereIn?: [string, any[]]
    offset?: number
    limit?: number
  }): Promise<NoticeDetail[]> => {
    let query = this.knex
      .select([
        'notice.id',
        'notice.uuid',
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
      .whereIn('notice_detail.notice_type', DB_NOTICE_TYPES)

    if (where) {
      where.forEach((w) => {
        query = query.where(w[0], w[1], w[2])
      })
    }

    if (whereIn) {
      query = query.whereIn(...whereIn)
    }

    if (offset) {
      query = query.offset(offset)
    }

    if (limit) {
      query = query.limit(limit)
    }

    const result = await query

    return result
  }

  /**
   * Find notice entities by a given notice id
   */
  findEntities = async (
    noticeId: string,
    expand: boolean = true
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
      entities.forEach(async ({ type, entityId, table }: any) => {
        const entity = await this.knex
          .select()
          .from(table)
          .where({ id: entityId })
          .first()

        _entities[type] = entity
      })
      return _entities
    }

    return entities
  }

  /**
   * Find notice actors by a given notice id
   */
  findActors = async (
    noticeId: string
  ): Promise<Array<User & { noticeActorCreatedAt: string }>> => {
    const actors = await this.knex
      .select('user.*', 'notice_actor.created_at as noticeActorCreatedAt')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
    return actors
  }

  /**
   * Find notices by given ids.
   */
  findByIds = async (ids: readonly string[]): Promise<NoticeItem[]> => {
    const notices = await this.findDetail({
      whereIn: ['notice.id', ids as string[]],
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

  /*********************************
   *                               *
   *           By User             *
   *                               *
   *********************************/
  findByUser = async ({
    userId,
    limit = BATCH_SIZE,
    offset = 0,
  }: {
    userId: string
    limit?: number
    offset?: number
  }): Promise<NoticeItem[]> => {
    const notices = await this.findDetail({
      where: [[{ recipientId: userId, deleted: false }]],
      offset,
      limit,
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

  findDailySummaryUsers = async (): Promise<User[]> => {
    const recipients = await this.knex('notice')
      .select('user.*')
      .where({
        unread: true,
        deleted: false,
        'user_notify_setting.enable': true,
        'user_notify_setting.email': true,
      })
      .where(
        'notice.updated_at',
        '>=',
        this.knex.raw(`now() -  interval '1 days'`)
      )
      .join('user', 'user.id', 'recipient_id')
      .join(
        'user_notify_setting',
        'user_notify_setting.user_id',
        'recipient_id'
      )
      .groupBy('user.id')

    return recipients
  }

  findDailySummaryNoticesByUser = async (
    userId: string
  ): Promise<NoticeItem[]> => {
    const validNoticeTypes = [
      'user_new_follower',
      'article_new_collected',
      'article_new_appreciation',
      'article_new_subscriber',
      'article_new_comment',
      'article_mentioned_you',
      'comment_new_reply',
      'comment_mentioned_you',
    ]
    const noticeDetails = await this.findDetail({
      where: [
        [{ recipientId: userId, deleted: false, unread: true }],
        [
          'notice.updated_at',
          '>=',
          this.knex.raw(`now() -  interval '1 days'`),
        ],
      ],
      whereIn: ['notice_detail.notice_type', validNoticeTypes],
    })

    const notices = await Promise.all(
      noticeDetails.map(async (n: NoticeDetail) => {
        const entities = (await this.findEntities(n.id)) as NoticeEntitiesMap
        const actors = (await this.findActors(n.id)).filter(
          (actor) =>
            new Date(actor.noticeActorCreatedAt) >=
            new Date(Date.now() - DAY * 1)
        )

        return {
          ...n,
          createdAt: n.updatedAt,
          type: n.noticeType,
          actors,
          entities,
        }
      })
    )

    const uniqNotices = uniqBy(notices, (n) => {
      const actors = n.actors.map(({ id }) => id).join('')
      const entities = `${n?.entities?.target?.id || ''}`
      const uniqId = `type:${n.type}::actors:${actors}::entities:${entities}`

      return uniqId
    })

    return uniqNotices
  }

  checkUserNotifySetting = async ({
    event,
    setting,
  }: {
    event: NotificationType
    setting: any
  }) => {
    if (!setting || !setting.enable) {
      return false
    }

    const noticeSettingMap: { [key in NotificationType]: boolean } = {
      user_new_follower: setting.follow,
      article_published: true,
      article_new_collected: setting.downstream,
      article_new_appreciation: setting.appreciation,
      article_new_subscriber: setting.articleSubscription,
      article_new_comment: setting.comment,
      article_mentioned_you: setting.mention,
      subscribed_article_new_comment: setting.commentSubscribed,
      comment_pinned: setting.commentPinned,
      comment_new_reply: setting.comment,
      comment_mentioned_you: setting.mention,
      official_announcement: setting.officialNotice,
      user_activated: true,
      user_banned: true,
      user_frozen: true,
      user_unbanned: true,
      comment_banned: setting.reportFeedback,
      article_banned: setting.reportFeedback,
      comment_reported: setting.reportFeedback,
      article_reported: setting.reportFeedback,
      article_tag_has_been_added: setting.tag,
      article_tag_has_been_removed: setting.tag,
      article_tag_has_been_unselected: setting.tag,
      payment_received_donation: true,
      payment_payout: true,
      tag_adoption: true,
      tag_leave: true,
      tag_add_editor: true,
      tag_leave_editor: true,
      revised_article_published: true,
      revised_article_not_published: true,
    }

    return noticeSettingMap[event]
  }

  markAllNoticesAsRead = async (userId: string) =>
    this.knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })

  countNotice = async ({
    userId,
    unread,
  }: {
    userId: string
    unread?: boolean
  }) => {
    let qs = this.knex('notice')
      .where({ recipientId: userId, deleted: false })
      .count()
      .first()

    if (unread) {
      qs = qs.where({ unread: true })
    }

    const result = await qs
    return parseInt(result ? (result.count as string) : '0', 10)
  }
}

export const notice = new Notice()

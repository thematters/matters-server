import DataLoader from 'dataloader'
import { isArray, isEqual, mergeWith, uniq } from 'lodash'
import { v4 } from 'uuid'

import { DB_NOTICE_TYPE } from 'common/enums'
import { getLogger } from 'common/logger'
import { BaseService } from 'connectors'
import {
  GQLNotificationSettingType,
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
} from 'definitions'

const logger = getLogger('service:notice')

export type DBNotificationSettingType = keyof typeof GQLNotificationSettingType

const mergeDataCustomizer = (objValue: any, srcValue: any) => {
  if (isArray(objValue)) {
    return uniq(objValue.concat(srcValue))
  }
}

const mergeDataWith = (objValue: any, srcValue: any) => {
  return mergeWith(objValue, srcValue, mergeDataCustomizer)
}

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
        // const [{ id: noticeActorId }] =
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
      await trx
        .insert({
          noticeId,
          actorId,
        })
        .into('notice_actor')
        .returning('*')
        .onConflict(['actor_id', 'notice_id'])
        .ignore() // .merge({ updatedAt: this.knex.fn.now(), })

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
  async updateNoticeData({
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
  process = async (
    params: PutNoticeParams
  ): Promise<{ created: boolean; bundled: boolean }> => {
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
  findDetail = async ({
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
    const query = this.knex
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
      .whereIn('notice_detail.notice_type', Object.values(DB_NOTICE_TYPE))

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
    take,
    skip,
  }: {
    userId: string
    take?: number
    skip?: number
  }): Promise<NoticeItem[]> => {
    const notices = await this.findDetail({
      where: [[{ recipientId: userId, deleted: false }]],
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

  checkUserNotifySetting = async ({
    event,
    setting,
  }: {
    event: NotificationType
    setting: { [key in DBNotificationSettingType]: boolean }
  }) => {
    if (!setting || !setting.enable) {
      return false
    }

    const noticeSettingMap: Record<NotificationType, boolean> = {
      // user
      user_new_follower: setting.userNewFollower,

      // article
      article_published: true,
      article_new_appreciation: setting.articleNewAppreciation,
      article_new_subscriber: setting.articleNewSubscription,
      article_mentioned_you: setting.mention,
      revised_article_published: true,
      revised_article_not_published: true,
      circle_new_article: setting.inCircleNewArticle,

      // article-article
      article_new_collected: setting.articleNewCollected,

      // comment
      comment_pinned: setting.articleCommentPinned,
      comment_mentioned_you: setting.mention,
      article_new_comment: setting.articleNewComment,
      subscribed_article_new_comment: setting.articleSubscribedNewComment,
      circle_new_broadcast: setting.inCircleNewBroadcast,

      // comment-comment
      comment_new_reply: setting.articleNewComment,

      // article-tag
      article_tag_has_been_added: true,
      article_tag_has_been_removed: true,
      article_tag_has_been_unselected: true,

      // tag
      tag_adoption: true,
      tag_leave: true,
      tag_add_editor: true,
      tag_leave_editor: true,

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
      user_activated: true,
      user_banned: true,
      user_frozen: true,
      user_unbanned: true,
      comment_banned: true,
      article_banned: true,
      comment_reported: true,
      article_reported: true,
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
    const query = this.knex('notice')
      .where({ recipientId: userId, deleted: false })
      .count()
      .first()

    if (unread) {
      query.where({ unread: true })
    }

    const result = await query
    return parseInt(result ? (result.count as string) : '0', 10)
  }
}

export const notice = new Notice()

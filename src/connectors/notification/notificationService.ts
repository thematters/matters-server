import type {
  Connections,
  NotificationParams,
  NoticeItem,
  NoticeDetail,
  NoticeEntitiesMap,
  NoticeEntity,
  User,
  UserNotifySetting,
  PutNoticeParams,
  PutNoticesParams,
  NoticeData,
  NotificationType,
  NotificationEntity,
  LANGUAGES,
} from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  MONTH,
  QUEUE_URL,
  CACHE_TTL,
  USER_ACTION,
  NOTICE_TYPE,
  BUNDLED_NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from '#common/enums/index.js'
import { isTest } from '#common/environment.js'
import { getLogger } from '#common/logger.js'
import * as Sentry from '@sentry/node'
import _ from 'lodash'
import { v4 } from 'uuid'

import { ArticleService } from '../article/articleService.js'
import { AtomService } from '../atomService.js'
import { aws } from '../aws/index.js'

import { mail } from './mail/index.js'
import trans from './translations.js'
import { mergeDataWith } from './utils.js'

const { isEqual } = _

const logger = getLogger('service-notification')

const SKIP_NOTICE_FLAG_PREFIX = 'skip-notice'
const DELETE_NOTICE_KEY_PREFIX = 'delete-notice'
const LOCK_NOTICE_PREFIX = 'lock-notice'

export class NotificationService {
  public mail: typeof mail
  private connections: Connections
  private knex: Knex
  private knexRO: Knex
  private aws: typeof aws
  private models: AtomService

  public constructor(connections: Connections) {
    this.connections = connections
    this.knex = connections.knex
    this.knexRO = connections.knexRO
    this.mail = mail
    this.aws = aws
    this.models = new AtomService(this.connections)
  }

  // publish notice to SQS queue
  public trigger = async (params: NotificationParams) => {
    if (isTest) {
      return
    }
    logger.info(`triggered notification params: ${JSON.stringify(params)}`)

    if ('tag' in params) {
      // delete skip flag when sending this notice again
      await this.connections.redis.del(
        `${SKIP_NOTICE_FLAG_PREFIX}:${params.tag}`
      )
    }
    try {
      await this.aws.sqsSendMessage({
        messageBody: params,
        queueUrl: QUEUE_URL.notification,
      })
    } catch (error) {
      logger.error(error)
      Sentry.captureException(error)
    }
  }

  /**
   * Mark a notice tag for skipping processing in Lambda function;
   * And delete all recently sent notices recorded by Lambda
   */
  public withdraw = async (tag: string) => {
    const redis = this.connections.redis
    // wait for lambda to finish state mutation
    while (await redis.get(`${LOCK_NOTICE_PREFIX}:${tag}`)) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    // set skip flag for this tag
    await redis.set(
      `${SKIP_NOTICE_FLAG_PREFIX}:${tag}`,
      '1',
      'EX',
      CACHE_TTL.NOTICE
    )
    // delete all recently sent notices of this tag
    const deleteKey = `${DELETE_NOTICE_KEY_PREFIX}:${tag}`
    const noticeIds = await redis.smembers(deleteKey)
    await Promise.all(noticeIds.map((id: string) => this.deleteNotice(id)))
    await redis.del(deleteKey)
  }

  public markAllNoticesAsRead = async (userId: string) => {
    const knex = this.connections.knex
    return knex('notice')
      .where({ recipientId: userId, unread: true })
      .update({ unread: false })
  }

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

  public countNotice = async ({
    userId,
    unread,
    onlyRecent,
  }: {
    userId: string
    unread?: boolean
    onlyRecent?: boolean
  }) => {
    const knexRO = this.connections.knexRO
    const query = knexRO('notice')
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

  public async process(
    params: NotificationParams
  ): Promise<Array<{ id: string }>> {
    const noticeParams = await this.getNoticeParams(params)

    if (!noticeParams) {
      return []
    }

    const notices = []
    for (const [index, recipientId] of noticeParams.recipientIds.entries()) {
      // skip if actor === recipient
      if ('actorId' in params && params.actorId === recipientId) {
        logger.warn(
          `Actor ${params.actorId} is same as recipient ${recipientId}, skipped`
        )
        continue
      }

      // skip if user disable notify
      const notifySetting = await this.findNotifySetting(recipientId)
      const enable = await this.checkUserNotifySetting({
        event: params.event,
        setting: notifySetting,
      })

      if (!enable) {
        logger.info(`Send ${noticeParams.type} to ${recipientId} skipped`)
        continue
      }

      // skip if sender is blocked by recipient
      if ('actorId' in params && params.actorId) {
        const blocked = await this.knexRO
          .select()
          .from('action_user')
          .where({
            userId: recipientId,
            targetId: params.actorId,
            action: USER_ACTION.block,
          })
          .first()

        if (blocked) {
          logger.info(
            `Actor ${params.actorId} is blocked by recipient ${recipientId}, skipped`
          )
          continue
        }
      }

      // Put Notice to DB
      const { created, bundled, notice } = await this.bundleOrCreateNotice({
        ...noticeParams,
        recipientId,
        message: noticeParams.messages ? noticeParams.messages[index] : null,
      })

      if (!created && !bundled) {
        logger.info(`Notice ${params.event} to ${recipientId} skipped`)
        continue
      }

      notices.push(notice)
    }
    return notices
  }

  /**
   * Bundle with existing notice
   */
  private async addNoticeActor({
    noticeId,
    actorId,
  }: {
    noticeId: string
    actorId: string
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
   * Find notices with detail
   */
  public findDetail = async ({
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
    const knexRO = this.connections.knexRO
    const query = knexRO
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
  public findEntities = async (
    noticeId: string,
    expand = true
  ): Promise<NoticeEntity[] | NoticeEntitiesMap> => {
    const knexRO = this.connections.knex
    const entities = await knexRO
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
          const entity = await knexRO
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
    const knexRO = this.connections.knexRO
    const actors = await knexRO
      .select('user.*', 'notice_actor.created_at as noticeActorCreatedAt')
      .from('notice_actor')
      .innerJoin('user', 'notice_actor.actor_id', '=', 'user.id')
      .where({ noticeId })
    return actors
  }

  private deleteNotice = async (id: string) =>
    this.models.update({
      table: 'notice',
      where: { id },
      data: { deleted: true },
    })

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
  private bundleOrCreateNotice = async (
    params: PutNoticeParams
  ): Promise<{
    created: boolean
    bundled: boolean
    notice: { id: string }
  }> => {
    if (params.bundle?.disabled === true) {
      const notice = await this.create(params)
      return { created: true, bundled: false, notice }
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

        return {
          created: false,
          bundled: true,
          notice: { id: bundleables[0].id },
        }
      }

      // create new notice
      const notice = await this.create(params)
      return { created: true, bundled: false, notice }
    }
  }

  /**
   * Create a notice item
   */
  private async create({
    type,
    actorId,
    recipientId,
    entities,
    message,
    data,
  }: PutNoticeParams): Promise<{ id: string }> {
    const trx = await this.knex.transaction()
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
    const noticeId = (
      await trx
        .insert({
          uuid: v4(),
          noticeDetailId,
          recipientId,
        })
        .into('notice')
        .returning('id')
    )[0].id

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
    await trx.commit()
    return { id: noticeId }
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
      scheduled_article_published: true,
      article_new_appreciation: setting.newLike,
      article_new_subscriber: setting.articleNewSubscription,
      article_mentioned_you: setting.mention,
      revised_article_published: true,
      revised_article_not_published: true,
      circle_new_article: setting.inCircleNewArticle,

      // article-article
      article_new_collected: setting.articleNewCollected,

      // collection
      collection_liked: setting.newLike,

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

      // campaign-article
      campaign_article_featured: true,

      // transaction
      payment_received_donation: true,
      withdrew_locked_tokens: true,

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
      write_challenge_applied: true,
      write_challenge_applied_late_bird: true,
      badge_grand_slam_awarded: true,
      write_challenge_announcement: true,
      topic_channel_feedback_accepted: true,
    }

    return noticeSettingMap[event]
  }

  private getNoticeParams = async (
    params: NotificationParams
  ): Promise<PutNoticesParams | undefined> => {
    const recipient =
      'recipientId' in params
        ? await this.knexRO('user').where({ id: params.recipientId }).first()
        : null

    if ('recipientId' in params && !recipient) {
      logger.warn(`recipient ${params.recipientId} not found, skipped`)
      return
    }
    const articleService = new ArticleService(this.connections)
    switch (params.event) {
      // entity-free
      case NOTICE_TYPE.user_new_follower:
        return {
          type: params.event,
          recipientIds: [recipient.id],
          actorId: params.actorId,
        }
      // system as the actor
      case NOTICE_TYPE.article_published:
      case NOTICE_TYPE.revised_article_published:
      case NOTICE_TYPE.revised_article_not_published:
      case NOTICE_TYPE.scheduled_article_published:
      case NOTICE_TYPE.campaign_article_featured:
      case NOTICE_TYPE.circle_new_article: // deprecated
      case NOTICE_TYPE.topic_channel_feedback_accepted:
        return {
          type: params.event,
          recipientIds: [params.recipientId],
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
      case NOTICE_TYPE.withdrew_locked_tokens:
      case NOTICE_TYPE.circle_new_broadcast: // deprecated
      case NOTICE_TYPE.circle_new_subscriber:
      case NOTICE_TYPE.circle_new_follower:
      case NOTICE_TYPE.circle_new_unsubscriber:
      case NOTICE_TYPE.moment_liked:
      case NOTICE_TYPE.moment_comment_liked:
        return {
          type: params.event,
          recipientIds: [params.recipientId],
          actorId: params.actorId,
          entities: params.entities,
        }
      case NOTICE_TYPE.article_new_comment:
      case NOTICE_TYPE.article_comment_liked:
      case NOTICE_TYPE.collection_liked:
      case NOTICE_TYPE.moment_new_comment:
      case NOTICE_TYPE.moment_mentioned_you:
      case NOTICE_TYPE.moment_comment_mentioned_you:
        return {
          type: params.event,
          recipientIds: [params.recipientId],
          actorId: params.actorId,
          entities: params.entities,
          bundle: { disabled: true },
        }
      case NOTICE_TYPE.circle_invitation:
        return {
          type: params.event,
          recipientIds: [params.recipientId],
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
          recipientIds: [params.recipientId],
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
          recipientIds: [params.recipientId],
          actorId: params.actorId,
          entities: params.entities,
          data: params.data, // update latest comment to DB `data` field
          bundle: { mergeData: true },
        }
      // act as official announcement
      case NOTICE_TYPE.official_announcement:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [params.message],
          data: params.data,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_banned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [trans.user_banned(recipient.language, {})],
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_banned_payment:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [trans.user_banned_payment(recipient.language, {})],
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_frozen:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [trans.user_frozen(recipient.language, {})],
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [trans.user_unbanned(recipient.language, {})],
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.comment_banned(recipient.language, {
              content: params.entities[0].entity.content,
            }),
          ],
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_banned: {
        const article = await articleService.loadLatestArticleVersion(
          params.entities[0].entity.id
        )
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.article_banned(recipient.language, {
              title: article.title,
            }),
          ],
          entities: params.entities,
        }
      }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_reported:
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.comment_reported(recipient.language, {
              content: params.entities[0].entity.content,
            }),
          ],
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_reported: {
        const article = await articleService.loadLatestArticleVersion(
          params.entities[0].entity.id
        )
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.article_reported(recipient.language, {
              title: article.title,
            }),
          ],
          entities: params.entities,
        }
      }
      case OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied: {
        const campaign = await this.models.campaignIdLoader.load(
          params.entities[0].entity.id
        )
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.write_challenge_applied(recipient.language, {
              name: campaign.name,
            }),
          ],
          data: params.data,
        }
      }
      case OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied_late_bird: {
        const campaign = await this.models.campaignIdLoader.load(
          params.entities[0].entity.id
        )
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [
            trans.write_challenge_applied_late_bird(recipient.language, {
              name: campaign.name,
            }),
          ],
          data: params.data,
        }
      }
      case OFFICIAL_NOTICE_EXTEND_TYPE.badge_grand_slam_awarded: {
        const domain = process.env.MATTERS_DOMAIN ?? 'matters.town'
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: [params.recipientId],
          messages: [trans.badge_grand_slam_awarded(recipient.language, {})],
          data: {
            link: `https://${domain}/@${recipient.userName}?dialog=grand-badge&step=congrats`,
          },
        }
      }
      case OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_announcement: {
        const recipients = await this.knexRO('user')
          .select('user.*')
          .join('campaign_user', 'user.id', 'campaign_user.user_id')
          .where({
            'campaign_user.campaign_id': params.data.campaignId,
            'campaign_user.state': 'succeeded',
          })
        return {
          type: NOTICE_TYPE.official_announcement,
          recipientIds: recipients.map((r) => r.id),
          messages: recipients.map(
            ({ language }) => params.data.messages[language as LANGUAGES]
          ),
          data: {
            link: params.data.link,
          },
        }
      }
      default:
        // for exhaustively handle enum values,
        // see https://medium.com/typescript-tidbits/exhaustively-handle-enum-values-in-switch-case-at-compile-time-abf6cf1a42b7
        shouldBeUnreachable(params)
    }
  }
  private findNotifySetting = async (userId: string) =>
    this.knexRO('user_notify_setting').select().where({ userId }).first()
}

const shouldBeUnreachable = (value: never) =>
  logger.error(`unhandle value: ${value}`)

import type {
  Connections,
  UserNotifySetting,
  LANGUAGES,
  NotificationParams,
  PutNoticeParams,
} from 'definitions'

import Queue from 'bull'
import { get } from 'lodash'

import {
  BUNDLED_NOTICE_TYPE,
  NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
  QUEUE_NAME,
  QUEUE_CONCURRENCY,
  QUEUE_JOB,
  QUEUE_DELAY,
} from 'common/enums'
import { getLogger } from 'common/logger'
import { UserService, AtomService, ArticleService } from 'connectors'
import { getOrCreateQueue } from 'connectors/queue'

import { mail } from './mail'
import { Notice } from './notice'
import trans from './translations'

const logger = getLogger('service-notification')

export class NotificationService {
  public mail: typeof mail
  public notice: Notice
  private q: InstanceType<typeof Queue>
  private delay: number | undefined
  private connections: Connections

  public constructor(connections: Connections, options?: { delay: number }) {
    this.connections = connections
    this.mail = mail
    this.notice = new Notice(connections)
    const [queue, created] = getOrCreateQueue(QUEUE_NAME.notification)
    if (created) {
      queue.process(
        QUEUE_JOB.sendNotification,
        QUEUE_CONCURRENCY.sendNotification,
        this.handleTrigger
      )
    }
    this.q = queue
    this.delay = options?.delay ?? QUEUE_DELAY.sendNotification
  }

  public trigger = async (params: NotificationParams) => {
    return this.q.add(QUEUE_JOB.sendNotification, params, {
      delay: this.delay,
      jobId: this.genNoticeJobId(params),
    })
  }

  public cancel = async (params: NotificationParams): Promise<void> => {
    const job = await this.q.getJob(this.genNoticeJobId(params))
    const state = await job?.getState()
    if (job && state !== 'completed' && state !== 'failed') {
      await job.remove()
    }
  }

  private genNoticeJobId = (params: NotificationParams) => {
    const entities = get(params, 'entities', [])
    return `${params.event}-${get(params, 'actorId', 0)}-${
      params.recipientId
    }-${entities
      .map(({ entity }: { entity: { id: string } }) => entity.id)
      .join(':')}`
  }

  private handleTrigger: Queue.ProcessCallbackFunction<unknown> = async (job) =>
    this.__trigger(job.data as NotificationParams)

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
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
        }
      case NOTICE_TYPE.article_new_comment:
      case NOTICE_TYPE.article_comment_liked:
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

  private async __trigger(params: NotificationParams) {
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
    const enable = await this.notice.checkUserNotifySetting({
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
    if ('actorId' in params) {
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
    const { created, bundled } = await this.notice.process(noticeParams)

    if (!created && !bundled) {
      logger.info(`Notice ${params.event} to ${params.recipientId} skipped`)
      return
    }
  }
}

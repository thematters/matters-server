import { DB_NOTICE_TYPE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import logger from 'common/logger'
import { BaseService, UserService } from 'connectors'
import {
  LANGUAGES,
  NotificationPrarms,
  PutNoticeParams,
  User,
} from 'definitions'

import { mail } from './mail'
import { notice } from './notice'
import { pubsub } from './pubsub'
import { push } from './push'
import trans from './translations'

export class NotificationService extends BaseService {
  mail: typeof mail
  push: typeof push
  notice: typeof notice
  pubsub: typeof pubsub

  constructor() {
    super('noop')
    this.mail = mail
    this.push = push
    this.notice = notice
    this.pubsub = pubsub
  }

  trigger = async (params: NotificationPrarms) => {
    try {
      await this.__trigger(params)
    } catch (e) {
      logger.error('[Notification:trigger]', e)
    }
  }

  private getNoticeParams = async (
    params: NotificationPrarms,
    language: LANGUAGES
  ): Promise<PutNoticeParams | undefined> => {
    switch (params.event) {
      // entity-free
      case DB_NOTICE_TYPE.user_new_follower:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
        }
      // system as the actor
      case DB_NOTICE_TYPE.article_published:
      case DB_NOTICE_TYPE.comment_pinned:
      case DB_NOTICE_TYPE.payment_payout:
      case DB_NOTICE_TYPE.revised_article_published:
      case DB_NOTICE_TYPE.revised_article_not_published:
      case DB_NOTICE_TYPE.circle_new_article:
        return {
          type: params.event,
          recipientId: params.recipientId,
          entities: params.entities,
        }
      // single actor with one or more entities
      case DB_NOTICE_TYPE.article_new_collected:
      case DB_NOTICE_TYPE.article_new_appreciation:
      case DB_NOTICE_TYPE.article_new_subscriber:
      case DB_NOTICE_TYPE.article_mentioned_you:
      case DB_NOTICE_TYPE.comment_mentioned_you:
      case DB_NOTICE_TYPE.circle_broadcast_mentioned_you:
      case DB_NOTICE_TYPE.circle_discussion_mentioned_you:
      case DB_NOTICE_TYPE.article_new_comment:
      case DB_NOTICE_TYPE.subscribed_article_new_comment:
      case DB_NOTICE_TYPE.comment_new_reply:
      case DB_NOTICE_TYPE.circle_broadcast_new_reply:
      case DB_NOTICE_TYPE.circle_discussion_new_reply:
      case DB_NOTICE_TYPE.article_tag_has_been_added:
      case DB_NOTICE_TYPE.article_tag_has_been_removed:
      case DB_NOTICE_TYPE.article_tag_has_been_unselected:
      case DB_NOTICE_TYPE.payment_received_donation:
      case DB_NOTICE_TYPE.tag_adoption:
      case DB_NOTICE_TYPE.tag_leave:
      case DB_NOTICE_TYPE.tag_add_editor:
      case DB_NOTICE_TYPE.tag_leave_editor:
      case DB_NOTICE_TYPE.circle_new_follower:
      case DB_NOTICE_TYPE.circle_new_subscriber:
      case DB_NOTICE_TYPE.circle_new_unsubscriber:
      case DB_NOTICE_TYPE.circle_new_broadcast:
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
        }
      // act as official annonuncement
      case DB_NOTICE_TYPE.official_announcement:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: params.message,
          data: params.data,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_activated:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_activiated(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_banned:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_banned(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_frozen:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_frozen(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.user_unbanned:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.user_unbanned(language, {}),
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_banned:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.comment_banned(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_banned:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.article_banned(language, {
            title: params.entities[0].entity.title,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.comment_reported:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.comment_reported(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case OFFICIAL_NOTICE_EXTEND_TYPE.article_reported:
        return {
          type: DB_NOTICE_TYPE.official_announcement,
          recipientId: params.recipientId,
          message: trans.article_reported(language, {
            title: params.entities[0].entity.title,
          }),
          entities: params.entities,
        }
      default:
        return
    }
  }

  private async __trigger(params: NotificationPrarms) {
    const userService = new UserService()
    const recipient = (await userService.dataloader.load(
      params.recipientId
    )) as User

    if (!recipient) {
      logger.info(`recipient ${params.recipientId} not found, skipped`)
      return
    }

    const noticeParams = await this.getNoticeParams(params, recipient.language)

    if (!noticeParams) {
      return
    }

    // skip if actor === recipient
    if ('actorId' in params && params.actorId === params.recipientId) {
      logger.info(
        `Actor ${params.actorId} is same as recipient ${params.recipientId}, skipped`
      )
      return
    }

    // skip if user disable notify
    const notifySetting = await userService.findNotifySetting(recipient.id)
    const enable = await this.notice.checkUserNotifySetting({
      event: params.event,
      setting: notifySetting,
    })
    if (!enable) {
      logger.info(
        `Send ${noticeParams.type} to ${noticeParams.recipientId} skipped`
      )
      return
    }

    // Put Notice to DB
    const { created, bundled } = await this.notice.process(noticeParams)

    if (!created && !bundled) {
      logger.info(`Notice ${params.event} to ${params.recipientId} skipped`)
      return
    }

    /**
     * Push Notification
     */
    this.push.push({
      noticeParams,
      recipient,
    })

    /**
     * Publish a PubSub event
     */
    // this.pubsub.publish(
    //   toGlobalId({
    //     type: 'User',
    //     id: noticeParams.recipientId,
    //   }),
    //   recipient
    // )
  }
}

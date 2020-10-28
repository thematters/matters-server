import logger from 'common/logger'
import { toGlobalId } from 'common/utils'
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

  trigger = (params: NotificationPrarms) => {
    try {
      this.__trigger(params)
    } catch (e) {
      logger.error('[Notification:trigger]', e)
    }
  }

  private getNoticeParams = async (
    params: NotificationPrarms,
    language: LANGUAGES
  ): Promise<PutNoticeParams | undefined> => {
    switch (params.event) {
      case 'user_new_follower':
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
        }
      case 'article_published':
      case 'comment_pinned':
      case 'payment_payout':
      case 'revised_article_published':
      case 'revised_article_not_published':
        return {
          type: params.event,
          recipientId: params.recipientId,
          entities: params.entities,
        }
      case 'article_new_downstream':
      case 'article_new_collected':
      case 'article_new_appreciation':
      case 'article_new_subscriber':
      case 'article_mentioned_you':
      case 'comment_mentioned_you':
      case 'article_new_comment':
      case 'subscribed_article_new_comment':
      case 'comment_new_reply':
      case 'article_tag_has_been_added':
      case 'article_tag_has_been_removed':
      case 'article_tag_has_been_unselected':
      case 'payment_received_donation':
      case 'tag_adoption':
      case 'tag_leave':
      case 'tag_add_editor':
      case 'tag_leave_editor':
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorId: params.actorId,
          entities: params.entities,
        }
      case 'official_announcement':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: params.message,
          data: params.data,
        }
      case 'user_activated':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.user_activiated(language, {}),
        }
      case 'user_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.user_banned(language, {}),
        }
      case 'user_frozen':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.user_frozen(language, {}),
        }
      case 'user_unbanned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.user_unbanned(language, {}),
        }
      case 'comment_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.comment_banned(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case 'article_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.article_banned(language, {
            title: params.entities[0].entity.title,
          }),
          entities: params.entities,
        }
      case 'comment_reported':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.comment_reported(language, {
            content: params.entities[0].entity.content,
          }),
          entities: params.entities,
        }
      case 'article_reported':
        return {
          type: 'official_announcement',
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

//local
import { NotificationType, NotificationPrarms } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'
import { notificationQueue } from 'connectors/queue'

import { mailService } from './mail'
import { pushService } from './push'
import { noticeService, PutNoticeParams } from './notice'
import { pubsubService } from './pubsub'

export class NotificationService extends BaseService {
  mailService: typeof mailService
  pushService: typeof pushService
  noticeService: typeof noticeService
  pubsubService: typeof pubsubService

  constructor() {
    super('noop')
    this.mailService = mailService
    this.pushService = pushService
    this.noticeService = noticeService
    this.pubsubService = pubsubService
  }

  private async __trigger(params: NotificationPrarms) {
    let noticeParams: PutNoticeParams

    switch (params.event) {
      case 'article_updated':
        this.pubsubService.engine.publish(
          toGlobalId({
            type: 'Article',
            id: params.entities[0].entity.id
          }),
          params.entities[0]
        )
        return
      case 'user_new_follower':
      case 'comment_new_upvote':
        noticeParams = {
          type: params.event,
          recipientId: params.recipientId,
          actorIds: [params.actorId]
        }
        break
      case 'user_disabled':
        noticeParams = {
          type: params.event,
          recipientId: params.recipientId,
          data: params.data
        }
        break
      case 'article_published':
      case 'comment_pinned':
      case 'upstream_article_archived':
      case 'downstream_article_archived':
        noticeParams = {
          type: params.event,
          recipientId: params.recipientId,
          entities: params.entities
        }
        break
      case 'article_new_downstream':
      case 'article_new_appreciation':
      case 'article_new_subscriber':
      case 'comment_mentioned_you':
      case 'article_new_comment':
      case 'subscribed_article_new_comment':
      case 'comment_new_reply':
        noticeParams = {
          type: params.event,
          recipientId: params.recipientId,
          actorIds: [params.actorId],
          entities: params.entities
        }
        break
      case 'official_announcement':
        noticeParams = {
          type: params.event,
          recipientId: params.recipientId,
          message: params.message,
          data: params.data
        }
        break
      default:
        return
    }

    // Put Notice to DB
    const { created, bundled } = await this.noticeService.process(noticeParams)

    if (!created && !bundled) {
      return
    }

    // Publish a event due to the recipent has a new unread notice
    const recipient = await this.baseFindById(noticeParams.recipientId, 'user')
    this.pubsubService.engine.publish(
      toGlobalId({
        type: 'User',
        id: noticeParams.recipientId
      }),
      recipient
    )

    // Push Notification
    const { canPush } = await this.checkUserNoifySetting({
      event: params.event,
      userId: noticeParams.recipientId
    })

    if (canPush) {
      notificationQueue.pushNotification({
        text: noticeParams.message || `[PUSH] ${params.event}`, // TODO
        userIds: [noticeParams.recipientId]
      })
    }
  }

  checkUserNoifySetting = async ({
    event,
    userId
  }: {
    event: NotificationType
    userId: string
  }): Promise<{ canPush: boolean }> => {
    const setting = await this.knex
      .select()
      .where({ userId })
      .from('user_notify_setting')
      .first()

    if (!setting || !setting.enable) {
      return { canPush: false }
    }

    const eventSettingMap: { [key in NotificationType]: boolean } = {
      article_updated: false,
      user_new_follower: setting.follow,
      user_disabled: true,
      article_published: true,
      article_new_downstream: setting.downstream,
      article_new_appreciation: setting.appreciation,
      article_new_subscriber: setting.articleSubscription,
      article_new_comment: setting.comment,
      subscribed_article_new_comment: setting.commentSubscribed,
      upstream_article_archived: setting.downstream,
      downstream_article_archived: setting.downstream,
      comment_pinned: setting.commentPinned,
      comment_new_reply: setting.comment,
      comment_new_upvote: setting.commentVoted,
      comment_mentioned_you: setting.mention,
      official_announcement: setting.officialNotice
    }

    return {
      canPush: eventSettingMap[event]
    }
  }

  trigger = (params: NotificationPrarms) => {
    try {
      this.__trigger(params)
    } catch (e) {
      console.error('[Notification:trigger]', e)
    }
  }
}

//local
import { NotificationPrarms, NoticeEntityType } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'

import MailService from './mail'
import PushService from './push'
import NoticeService, { PutNoticeParams } from './notice'
import PubSubService from './pubsub'

export class NotificationService extends BaseService {
  mailService: InstanceType<typeof MailService>
  pushService: InstanceType<typeof PushService>
  noticeService: InstanceType<typeof NoticeService>
  pubsubService: InstanceType<typeof PubSubService>

  constructor() {
    super('noop')
    this.mailService = new MailService()
    this.pushService = new PushService()
    this.noticeService = new NoticeService()
    this.pubsubService = new PubSubService()
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
    this.pushService.push({
      text: noticeParams.message || `[PUSH] ${params.event}`, // TODO
      userIds: [noticeParams.recipientId]
    })

    // Send Email
    this.mailService.send()
  }

  trigger(params: NotificationPrarms) {
    try {
      this.__trigger(params)
    } catch (e) {
      console.error('[Notification:trigger]', e)
    }
  }
}

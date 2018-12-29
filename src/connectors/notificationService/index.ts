//local
import { NotificationPrarms } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'
import { environment } from 'common/environment'

import MailService from './mail'
import PushService from './push'
import NoticeService from './notice'
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
    switch (params.event) {
      case 'article_updated':
        const nodeGlobalId = toGlobalId({
          type: 'Article',
          id: params.article.id
        })
        this.pubsubService.publish(nodeGlobalId, params.article)
        break
      case 'user_new_follower':
        const { created, bundled } = await this.noticeService.process({
          type: params.event,
          actorIds: [params.actorId],
          recipientId: params.recipientId
        })
        if (!created && !bundled) {
          break
        }
        this.pushService.push({
          text: 'user_new_follower',
          userIds: [params.actorId]
        })
        break
    }
  }

  trigger(params: NotificationPrarms) {
    try {
      this.__trigger(params)
    } catch (e) {
      console.error('[Notification:trigger]', e)
    }
  }
}

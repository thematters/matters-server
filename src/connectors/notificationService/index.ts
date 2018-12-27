//local
import { NotificationPrarms } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'

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

  trigger(params: NotificationPrarms) {
    switch (params.type) {
      case 'article_updated':
        const nodeGlobalId = toGlobalId({
          type: 'Article',
          id: params.article.id
        })
        this.pubsubService.publish(nodeGlobalId, params.article)
        break
      case 'user_new_follower':
        this.noticeService.process(params)
        this.pushService.push({
          text: 'user_new_follower',
          userIds: params.actors
        })
    }
  }
}

//local
import logger from 'common/logger'
import { NotificationPrarms } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'

import { mail } from './mail'
import { push } from './push'
import { notice, PutNoticeParams } from './notice'
import { pubsub } from './pubsub'

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

  private async __trigger(params: NotificationPrarms) {
    let noticeParams: PutNoticeParams

    switch (params.event) {
      case 'article_updated':
        this.pubsub.engine.publish(
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
    const { created, bundled } = await this.notice.process(noticeParams)

    if (!created && !bundled) {
      logger.info(`Notice ${params.event} to ${params.recipientId} skipped`)
      return
    }

    // Publish a PubSub event due to the recipent has a new unread notice
    const recipient = await this.baseFindById(noticeParams.recipientId, 'user')
    this.pubsub.engine.publish(
      toGlobalId({
        type: 'User',
        id: noticeParams.recipientId
      }),
      recipient
    )

    // Push Notification
    this.push.push(noticeParams)
  }

  trigger = (params: NotificationPrarms) => {
    try {
      this.__trigger(params)
    } catch (e) {
      logger.error('[Notification:trigger]', e)
    }
  }
}

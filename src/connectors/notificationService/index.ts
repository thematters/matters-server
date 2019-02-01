//local
import logger from 'common/logger'
import { NotificationPrarms, PutNoticeParams } from 'definitions'
import { toGlobalId } from 'common/utils'
import { BaseService } from 'connectors/baseService'

import { mail } from './mail'
import { push } from './push'
import { notice } from './notice'
import { pubsub } from './pubsub'
import templates from './templates'

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

  private getNoticeParams = (
    params: NotificationPrarms
  ): PutNoticeParams | undefined => {
    switch (params.event) {
      case 'user_new_follower':
      case 'comment_new_upvote':
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorIds: [params.actorId]
        }
      case 'article_published':
      case 'comment_pinned':
      case 'upstream_article_archived':
      case 'downstream_article_archived':
        return {
          type: params.event,
          recipientId: params.recipientId,
          entities: params.entities
        }
      case 'article_new_downstream':
      case 'article_new_appreciation':
      case 'article_new_subscriber':
      case 'comment_mentioned_you':
      case 'article_new_comment':
      case 'subscribed_article_new_comment':
      case 'comment_new_reply':
        return {
          type: params.event,
          recipientId: params.recipientId,
          actorIds: [params.actorId],
          entities: params.entities
        }
      case 'official_announcement':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: params.message,
          data: params.data
        }
      case 'user_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.user_banned({}).message
        }
      case 'user_frozen':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.user_frozen().message
        }
      case 'comment_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.comment_banned({
            content: params.entities[0].entity.content
          }).message,
          entities: params.entities
        }
      case 'article_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.article_banned({
            title: params.entities[0].entity.title
          }).message,
          entities: params.entities
        }
      case 'comment_reported':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.comment_reported({
            content: params.entities[0].entity.content
          }).message,
          entities: params.entities
        }
      case 'article_reported':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: templates.article_reported({
            title: params.entities[0].entity.title
          }).message,
          entities: params.entities
        }
      default:
        return
    }
  }

  private async __trigger(params: NotificationPrarms) {
    const noticeParams = this.getNoticeParams(params)

    if (!noticeParams) {
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
    this.pubsub.publish(
      toGlobalId({
        type: 'User',
        id: noticeParams.recipientId
      }),
      recipient
    )

    // Push Notification
    this.push.push(noticeParams, params.event)
  }

  trigger = (params: NotificationPrarms) => {
    try {
      this.__trigger(params)
    } catch (e) {
      logger.error('[Notification:trigger]', e)
    }
  }
}

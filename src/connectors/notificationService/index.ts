//local
import logger from 'common/logger'
import { NotificationPrarms, PutNoticeParams, LANGUAGES } from 'definitions'
import { toGlobalId } from 'common/utils'
import { USER_ROLE } from 'common/enums'
import { BaseService } from 'connectors/baseService'

import { mail } from './mail'
import { push } from './push'
import { notice } from './notice'
import { pubsub } from './pubsub'
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

  private getNoticeParams = async (
    params: NotificationPrarms,
    language: LANGUAGES
  ): Promise<PutNoticeParams | undefined> => {
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
          message: trans.user_banned(language, {})
        }
      case 'user_frozen':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.user_frozen(language, {})
        }
      case 'comment_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.comment_banned(language, {
            content: params.entities[0].entity.content
          }),
          entities: params.entities
        }
      case 'article_banned':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.article_banned(language, {
            title: params.entities[0].entity.title
          }),
          entities: params.entities
        }
      case 'comment_reported':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.comment_reported(language, {
            content: params.entities[0].entity.content
          }),
          entities: params.entities
        }
      case 'article_reported':
        return {
          type: 'official_announcement',
          recipientId: params.recipientId,
          message: trans.article_reported(language, {
            title: params.entities[0].entity.title
          }),
          entities: params.entities
        }
      case 'user_activated':
        const invitation = params.entities[0].entity
        const invitationSender = await this.baseFindById(
          invitation.senderId,
          'user'
        )
        const invitationRecipient = await this.baseFindById(
          invitation.recipientId,
          'user'
        )

        if (invitationSender.id === params.recipientId) {
          return {
            type: 'official_announcement',
            recipientId: params.recipientId,
            message: trans.user_activated_sender(language, {
              displayName: invitationRecipient.displayName
            })
          }
        }

        if (invitationRecipient.id === params.recipientId) {
          return {
            type: 'official_announcement',
            recipientId: params.recipientId,
            message: trans.user_activated_recipient(language, {
              displayName:
                invitationSender.role !== USER_ROLE.admin
                  ? invitationSender.displayName
                  : 'Matty'
            })
          }
        }

        return
      default:
        return
    }
  }

  private async __trigger(params: NotificationPrarms) {
    const recipient = await this.baseFindById(params.recipientId, 'user')

    if (!recipient) {
      logger.info(`recipient ${params.recipientId} not found, skipped`)
      return
    }

    const noticeParams = await this.getNoticeParams(params, recipient.language)

    if (!noticeParams) {
      return
    }

    if ('actorId' in params && params.actorId === params.recipientId) {
      logger.info(
        `Actor ${params.actorId} is same as recipient ${
          params.recipientId
        }, skipped`
      )
      return
    }

    // Put Notice to DB
    const { created, bundled } = await this.notice.process(noticeParams)

    if (!created && !bundled) {
      logger.info(`Notice ${params.event} to ${params.recipientId} skipped`)
      return
    }

    // Publish a PubSub event due to the recipent has a new unread notice
    this.pubsub.publish(
      toGlobalId({
        type: 'User',
        id: noticeParams.recipientId
      }),
      recipient
    )

    // Push Notification
    // this.push.push(noticeParams, params.event, recipient.language)
  }

  trigger = (params: NotificationPrarms) => {
    try {
      this.__trigger(params)
    } catch (e) {
      logger.error('[Notification:trigger]', e)
    }
  }
}

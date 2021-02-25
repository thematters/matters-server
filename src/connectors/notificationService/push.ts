import _ from 'lodash'

import { DB_NOTICE_TYPE } from 'common/enums'
import { numRound } from 'common/utils'
import { BaseService } from 'connectors'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES, PutNoticeParams, User } from 'definitions'

import trans from './translations'

class Push extends BaseService {
  constructor() {
    super('push_device')
  }

  generatePushText = async ({
    type,
    actorId,
    entities,
    message,
    language,
  }: PutNoticeParams & { language: LANGUAGES }): Promise<
    string | null | undefined
  > => {
    const actor = actorId ? await this.baseFindById(actorId, 'user') : null
    const target = _.find(entities, ['type', 'target'])
    const collection = _.find(entities, ['type', 'collection'])
    // const comment = _.find(entities, ['type', 'comment'])
    // const reply = _.find(entities, ['type', 'reply'])

    switch (type) {
      case DB_NOTICE_TYPE.user_new_follower:
        return (
          actor &&
          trans.user_new_follower(language, {
            displayName: actor.displayName,
          })
        )
      case DB_NOTICE_TYPE.article_published:
        return (
          target &&
          trans.article_published(language, { title: target.entity.title })
        )
      case DB_NOTICE_TYPE.article_new_collected:
        return (
          actor &&
          target &&
          collection &&
          trans.article_new_collected(language, {
            displayName: actor.displayName,
            collectionTitle: collection.entity.title,
            title: target.entity.title,
          })
        )
      case DB_NOTICE_TYPE.article_new_appreciation:
        return (
          actor &&
          trans.article_new_appreciation(language, {
            displayName: actor.displayName,
          })
        )
      case DB_NOTICE_TYPE.article_new_subscriber:
        return (
          actor &&
          target &&
          trans.article_new_subscriber(language, {
            displayName: actor.displayName,
            title: target.entity.title,
          })
        )
      case DB_NOTICE_TYPE.article_new_comment:
        return (
          actor &&
          target &&
          trans.article_new_comment(language, {
            displayName: actor.displayName,
            title: target.entity.title,
          })
        )
      case DB_NOTICE_TYPE.article_mentioned_you:
        return (
          actor &&
          target &&
          trans.article_mentioned_you(language, {
            displayName: actor.displayName,
            title: target.entity.title,
          })
        )
      case DB_NOTICE_TYPE.subscribed_article_new_comment:
        return (
          actor &&
          target &&
          trans.subscribed_article_new_comment(language, {
            displayName: actor.displayName,
            title: target.entity.title,
          })
        )
      case DB_NOTICE_TYPE.comment_pinned:
        return (
          actor &&
          trans.comment_pinned(language, { displayName: actor.displayName })
        )
      case DB_NOTICE_TYPE.comment_new_reply:
        return (
          actor &&
          trans.comment_new_reply(language, {
            displayName: actor.displayName,
          })
        )
      case DB_NOTICE_TYPE.comment_mentioned_you:
        return (
          actor &&
          trans.comment_mentioned_you(language, {
            displayName: actor.displayName,
          })
        )
      case DB_NOTICE_TYPE.official_announcement:
        return message && trans.official_announcement(language, { message })
      case DB_NOTICE_TYPE.payment_received_donation:
        return (
          actor &&
          target &&
          trans.payment_received_donation(language, {
            displayName: actor.displayName,
            userName: actor.userName,
            amount: numRound(target.entity.amount),
            currency: target.entity.currency,
          })
        )
      // TODO: circle notices
    }
  }

  push = async ({
    noticeParams,
    recipient,
  }: {
    noticeParams: PutNoticeParams
    recipient: User
  }) => {
    const text = await this.generatePushText({
      ...noticeParams,
      language: recipient.language,
    })

    if (!recipient || !text) {
      return
    }

    notificationQueue.pushNotification({
      recipients: [recipient.id],
      body: text,
    })
  }
}

export const push = new Push()

import _ from 'lodash'

import { BaseService } from 'connectors/baseService'
import notificationQueue from 'connectors/queue/notification'
import { NotificationType, PutNoticeParams, LANGUAGES } from 'definitions'
import logger from 'common/logger'

import trans from './translations'

class Push extends BaseService {
  constructor() {
    super('push_device')
  }

  checkUserNotifySetting = async ({
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

    console.log(setting)

    if (!setting || !setting.enable) {
      return { canPush: false }
    }

    const noticeSettingMap: { [key in NotificationType]: boolean } = {
      user_new_follower: setting.follow,
      article_published: true,
      article_new_downstream: setting.downstream,
      article_new_collected: setting.downstream,
      article_new_appreciation: setting.appreciation,
      article_new_subscriber: setting.articleSubscription,
      article_new_comment: setting.comment,
      article_mentioned_you: setting.mention,
      subscribed_article_new_comment: setting.commentSubscribed,
      upstream_article_archived: setting.downstream,
      downstream_article_archived: setting.downstream,
      comment_pinned: setting.commentPinned,
      comment_new_reply: setting.comment,
      comment_new_upvote: setting.commentVoted,
      comment_mentioned_you: setting.mention,
      official_announcement: setting.officialNotice,
      user_banned: true,
      user_frozen: true,
      comment_banned: setting.reportFeedback,
      article_banned: setting.reportFeedback,
      comment_reported: setting.reportFeedback,
      article_reported: setting.reportFeedback,
      user_activated: true,
      user_first_post_award: true
    }

    return {
      canPush: noticeSettingMap[event]
    }
  }

  generatePushText = async ({
    type,
    actorId,
    entities,
    message,
    language
  }: PutNoticeParams & { language: LANGUAGES }): Promise<
    string | null | undefined
  > => {
    const actor = actorId ? await this.baseFindById(actorId, 'user') : null
    const target = _.find(entities, ['type', 'target'])
    const downstream = _.find(entities, ['type', 'downstream'])
    const collection = _.find(entities, ['type', 'collection'])
    // const comment = _.find(entities, ['type', 'comment'])
    // const upstream = _.find(entities, ['type', 'upstream'])
    // const reply = _.find(entities, ['type', 'reply'])

    switch (type) {
      case 'user_new_follower':
        return (
          actor &&
          trans.user_new_follower(language, {
            displayName: actor.displayName
          })
        )
      case 'article_published':
        return (
          target &&
          trans.article_published(language, { title: target.entity.title })
        )
      case 'article_new_downstream':
        return (
          actor &&
          target &&
          trans.article_new_downstream(language, {
            displayName: actor.displayName,
            title: target.entity.title
          })
        )
      case 'article_new_collected':
        return (
          actor &&
          target &&
          collection &&
          trans.article_new_collected(language, {
            displayName: actor.displayName,
            collectionTitle: collection.entity.title,
            title: target.entity.title
          })
        )
      case 'article_new_appreciation':
        return (
          actor &&
          trans.article_new_appreciation(language, {
            displayName: actor.displayName
          })
        )
      case 'article_new_subscriber':
        return (
          actor &&
          target &&
          trans.article_new_subscriber(language, {
            displayName: actor.displayName,
            title: target.entity.title
          })
        )
      case 'article_new_comment':
        return (
          actor &&
          target &&
          trans.article_new_comment(language, {
            displayName: actor.displayName,
            title: target.entity.title
          })
        )
      case 'article_mentioned_you':
        return (
          actor &&
          target &&
          trans.article_mentioned_you(language, {
            displayName: actor.displayName,
            title: target.entity.title
          })
        )
      case 'subscribed_article_new_comment':
        return (
          actor &&
          target &&
          trans.subscribed_article_new_comment(language, {
            displayName: actor.displayName,
            title: target.entity.title
          })
        )
      case 'upstream_article_archived':
        return trans.upstream_article_archived(language, {})
      case 'downstream_article_archived':
        return (
          downstream &&
          trans.downstream_article_archived(language, {
            title: downstream.entity.title
          })
        )
      case 'comment_pinned':
        return (
          actor &&
          trans.comment_pinned(language, { displayName: actor.displayName })
        )
      case 'comment_new_reply':
        return (
          actor &&
          trans.comment_new_reply(language, {
            displayName: actor.displayName
          })
        )
      case 'comment_new_upvote':
        return (
          actor &&
          trans.comment_new_upvote(language, {
            displayName: actor.displayName
          })
        )
      case 'comment_mentioned_you':
        return (
          actor &&
          trans.comment_mentioned_you(language, {
            displayName: actor.displayName
          })
        )
      case 'official_announcement':
        return message && trans.official_announcement(language, { message })
    }
  }

  push = async (
    noticeParams: PutNoticeParams,
    event: NotificationType,
    language: LANGUAGES
  ) => {
    const { canPush } = await this.checkUserNotifySetting({
      event,
      userId: noticeParams.recipientId
    })

    if (!canPush) {
      logger.info(
        `Push ${noticeParams.type} to ${noticeParams.recipientId} skipped`
      )
      return
    }

    const recipient = await this.baseFindById(noticeParams.recipientId, 'user')
    const text = await this.generatePushText({ ...noticeParams, language })

    if (!recipient || !text) {
      return
    }

    notificationQueue.pushNotification({
      text,
      recipientUUIDs: [recipient.uuid]
    })
  }
}

export const push = new Push()

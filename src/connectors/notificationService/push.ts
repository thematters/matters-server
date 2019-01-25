import _ from 'lodash'

import { BaseService } from 'connectors/baseService'
import notificationQueue from 'connectors/queue/notification'
import { NotificationType } from 'definitions'
import logger from 'common/logger'

import { PutNoticeParams } from './notice'
import templates from './templates'

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

    if (!setting || !setting.enable) {
      return { canPush: false }
    }

    const noticeSettingMap: { [key in NotificationType]: boolean } = {
      user_new_follower: setting.follow,
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
      official_announcement: setting.officialNotice,
      user_banned: true,
      user_frozen: true,
      comment_banned: setting.reportFeedback,
      article_banned: setting.reportFeedback,
      comment_reported: setting.reportFeedback,
      article_reported: setting.reportFeedback
    }

    return {
      canPush: noticeSettingMap[event]
    }
  }

  generatePushText = async ({
    type,
    actorIds,
    entities,
    message
  }: PutNoticeParams): Promise<string | null | undefined> => {
    const actors = actorIds ? await this.baseFindByIds(actorIds, 'user') : null
    const target = _.find(entities, ['type', 'target'])
    const downstream = _.find(entities, ['type', 'downstream'])
    // const comment = _.find(entities, ['type', 'comment'])
    // const upstream = _.find(entities, ['type', 'upstream'])
    // const reply = _.find(entities, ['type', 'reply'])

    // TODO: i18n
    switch (type) {
      case 'user_new_follower':
        return (
          actors &&
          templates.user_new_follower({ displayName: actors[0].displayName })
            .message
        )
      case 'article_published':
        return (
          target &&
          templates.article_published({ title: target.entity.title }).message
        )
      case 'article_new_downstream':
        return (
          actors &&
          target &&
          templates.article_new_downstream({
            displayName: actors[0].displayName,
            title: target.entity.title
          }).message
        )
      case 'article_new_appreciation':
        return (
          actorIds &&
          templates.article_new_appreciation({
            displayName: actors[0].displayName
          }).message
        )
      case 'article_new_subscriber':
        return (
          actors &&
          target &&
          templates.article_new_subscriber({
            displayName: actors[0].displayName,
            title: target.entity.title
          }).message
        )
      case 'article_new_comment':
        return (
          actors &&
          target &&
          templates.article_new_comment({
            displayName: actors[0].displayName,
            title: target.entity.title
          }).message
        )
      case 'subscribed_article_new_comment':
        return (
          actors &&
          target &&
          templates.subscribed_article_new_comment({
            displayName: actors[0].displayName,
            title: target.entity.title
          }).message
        )
      case 'upstream_article_archived':
        return templates.upstream_article_archived().message
      case 'downstream_article_archived':
        return (
          downstream &&
          templates.downstream_article_archived({
            title: downstream.entity.title
          }).message
        )
      case 'comment_pinned':
        return (
          actors &&
          templates.comment_pinned({ displayName: actors[0].displayName })
            .message
        )
      case 'comment_new_reply':
        return (
          actors &&
          templates.comment_new_reply({ displayName: actors[0].displayName })
            .message
        )
      case 'comment_new_upvote':
        return (
          actors &&
          templates.comment_new_upvote({ displayName: actors[0].displayName })
            .message
        )
      case 'comment_mentioned_you':
        return (
          actors &&
          templates.comment_mentioned_you({
            displayName: actors[0].displayName
          }).message
        )
      case 'official_announcement':
        return message && templates.official_announcement({ message }).message
    }
  }

  push = async (noticeParams: PutNoticeParams, event: NotificationType) => {
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

    const recipientUUID = await this.baseFindById(
      noticeParams.recipientId,
      'user'
    )
    const text = await this.generatePushText(noticeParams)

    if (!recipientUUID || !text) {
      return
    }

    notificationQueue.pushNotification({
      text,
      recipientUUIDs: [recipientUUID]
    })
  }
}

export const push = new Push()

import _ from 'lodash'
import { BaseService } from 'connectors/baseService'
import notificationQueue from 'connectors/queue/notification'
import { NotificationType } from 'definitions'
import { PutNoticeParams } from './notice'
import logger from 'common/logger'

class Push extends BaseService {
  constructor() {
    super('push_device')
  }

  checkUserNotifySetting = async ({
    noticeType,
    userId
  }: {
    noticeType: NotificationType
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
      article_updated: false,
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
      official_announcement: setting.officialNotice
    }

    return {
      canPush: noticeSettingMap[noticeType]
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
        return actors && `${actors[0].displayName} 追蹤了你`
      case 'article_published':
        return target && `你的文章《${target.entity.title}》已發佈到分佈式網絡`
      case 'article_new_downstream':
        return (
          actors &&
          target &&
          `${actors[0].displayName} 引申了你的文章《${target.entity.title}》`
        )
      case 'article_new_appreciation':
        return actors && `${actors[0].displayName} 讚賞了你的文章`
      case 'article_new_subscriber':
        return (
          actors &&
          target &&
          `${actors[0].displayName} 收藏了你的文章《${target.entity.title}》`
        )
      case 'article_new_comment':
        return (
          actors &&
          target &&
          `${actors[0].displayName} 評論了你收藏的文章《${
            target.entity.title
          }》`
        )
      case 'subscribed_article_new_comment':
        return (
          actors &&
          target &&
          `${actors[0].displayName} 評論了你收藏的文章 ${target.entity.title}`
        )
      case 'upstream_article_archived':
        return '你的文章上游已断开'
      case 'downstream_article_archived':
        return (
          downstream && `你的文章的引申文章《${downstream.entity.title}》被隐藏`
        )
      case 'comment_pinned':
        return actors && `${actors[0].displayName} 置頂了你的評論`
      case 'comment_new_reply':
        return actors && `${actors[0].displayName} 回復了你的評論 `
      case 'comment_new_upvote':
        return actors && `${actors[0].displayName} 讚了你的評論 `
      case 'comment_mentioned_you':
        return actors && `${actors[0].displayName} 在評論中提及了你`
      case 'official_announcement':
        return message
    }
  }

  push = async (noticeParams: PutNoticeParams) => {
    const { canPush } = await this.checkUserNotifySetting({
      noticeType: noticeParams.type,
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

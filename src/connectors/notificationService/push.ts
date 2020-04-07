import _ from 'lodash'

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

  push = async ({
    noticeParams,
    recipient
  }: {
    noticeParams: PutNoticeParams
    recipient: User
  }) => {
    const text = await this.generatePushText({
      ...noticeParams,
      language: recipient.language
    })

    if (!recipient || !text) {
      return
    }

    notificationQueue.pushNotification({
      recipients: [recipient.id],
      body: text
    })
  }
}

export const push = new Push()

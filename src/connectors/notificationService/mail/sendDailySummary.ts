import _ from 'lodash'

import { DB_NOTICE_TYPE, EMAIL_TEMPLATE_ID } from 'common/enums'
import { environment } from 'common/environment'
import { notificationQueue } from 'connectors/queue/notification'
import { LANGUAGES, NoticeItem } from 'definitions'

import {
  getActors,
  getArticleDigest,
  getCommentDigest,
  getUserDigest,
  trans,
} from './utils'

export const sendDailySummary = async ({
  to,
  recipient,
  language = 'zh_hant',
  notices,
}: {
  to: string
  recipient: {
    displayName: string
  }
  language?: LANGUAGES
  notices: {
    user_new_follower: NoticeItem[]
    article_new_collected: NoticeItem[]
    article_new_appreciation: NoticeItem[]
    article_new_subscriber: NoticeItem[]
    article_new_comment: NoticeItem[]
    article_mentioned_you: NoticeItem[]
    comment_new_reply: NoticeItem[]
    comment_mentioned_you: NoticeItem[]

    circle_new_subscriber: NoticeItem[]
    circle_new_follower: NoticeItem[]
    circle_new_unsubscriber: NoticeItem[]
    circle_invitation: NoticeItem[]
    circle_new_broadcast: NoticeItem[]
    circle_new_discussion: NoticeItem[]
    circle_member_boradcast: NoticeItem[]
    circle_member_new_discussion: NoticeItem[]
    circle_member_new_discussion_reply: NoticeItem[]

    in_circle_new_article: NoticeItem[]
    in_circle_new_boradcast: NoticeItem[]
    in_circle_new_boradcast_reply: NoticeItem[]
    in_circle_new_discussion: NoticeItem[]
    in_circle_new_discussion_reply: NoticeItem[]
  }
}) => {
  const templateId = EMAIL_TEMPLATE_ID.dailySummary[language]
  const subject = trans.dailySummary(language, {
    displayName: recipient.displayName,
  })

  const user_new_follower = await Promise.all(
    notices.user_new_follower.map(async ({ actors = [] }) => ({
      actors: await getActors(actors),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  )
  const article_new_collected = await Promise.all(
    notices.article_new_collected.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const article_new_appreciation = await Promise.all(
    notices.article_new_appreciation.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const article_mentioned_you = await Promise.all(
    notices.article_mentioned_you.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const article_new_subscriber = await Promise.all(
    notices.article_new_subscriber.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const article_new_comment = await Promise.all(
    notices.article_new_comment.map(async ({ actors = [], entities }) => ({
      actors: await getActors(actors),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const comment_new_reply = await Promise.all(
    notices.comment_new_reply.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )
  const comment_mentioned_you = await Promise.all(
    notices.comment_mentioned_you.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )

  // circle owners
  const circle_new_subscriber = await Promise.all(
    notices.circle_new_subscriber.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  )
  const circle_new_follower = await Promise.all(
    notices.circle_new_follower.map(async ({ actors = [] }) => ({
      actors: await getActors(actors),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  )
  const circle_new_unsubscriber = await Promise.all(
    notices.circle_new_unsubscriber.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      actorCount: actors.length > 3 ? actors.length : false,
    }))
  )
  const circle_new_broadcast = await Promise.all(
    notices.circle_new_broadcast.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )
  const circle_new_discussion = await Promise.all(
    notices.circle_new_discussion.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )

  // for members in circle
  const in_circle_new_article = await Promise.all(
    notices.in_circle_new_article.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      article: await getArticleDigest(entities && entities.target),
    }))
  )
  const in_circle_new_boradcast = await Promise.all(
    notices.in_circle_new_boradcast.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )
  const in_circle_new_boradcast_reply = await Promise.all(
    notices.in_circle_new_boradcast_reply.map(
      async ({ actors = [], entities }) => ({
        actor: await getUserDigest(actors[0]),
        comment: await getCommentDigest(entities && entities.target),
      })
    )
  )
  const in_circle_new_discussion = await Promise.all(
    notices.in_circle_new_discussion.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )
  const in_circle_new_discussion_reply = await Promise.all(
    notices.in_circle_new_discussion.map(async ({ actors = [], entities }) => ({
      actor: await getUserDigest(actors[0]),
      comment: await getCommentDigest(entities && entities.target),
    }))
  )

  notificationQueue.sendMail({
    from: environment.emailFromAsk as string,
    templateId,
    personalizations: [
      {
        to,
        // @ts-ignore
        dynamic_template_data: {
          subject,
          siteDomain: environment.siteDomain,
          recipient,
          section: {
            follow: !!_.get(notices.user_new_follower, '0'),
            article: [
              DB_NOTICE_TYPE.article_new_collected,
              DB_NOTICE_TYPE.article_new_appreciation,
              DB_NOTICE_TYPE.article_new_subscriber,
              DB_NOTICE_TYPE.article_new_comment,
            ].some((type) => _.get(notices, `${type}.0`)),
            mention: [
              DB_NOTICE_TYPE.article_mentioned_you,
              DB_NOTICE_TYPE.comment_mentioned_you,
              DB_NOTICE_TYPE.comment_new_reply,
            ].some((type) => _.get(notices, `${type}.0`)),
          },
          notices: {
            user_new_follower,
            article_new_collected,
            article_new_appreciation,
            article_new_subscriber,
            article_new_comment,
            article_mentioned_you,
            comment_new_reply,
            comment_mentioned_you,

            // to circle owners
            circle_new_subscriber,
            circle_new_follower,
            circle_new_unsubscriber,
            circle_new_broadcast,
            circle_new_discussion,

            // for members in circle
            in_circle_new_article,
            in_circle_new_boradcast,
            in_circle_new_boradcast_reply,
            in_circle_new_discussion,
            in_circle_new_discussion_reply,
          },
        },
      },
    ],
  })
}

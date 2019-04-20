import _ from 'lodash'

import { NoticeItem } from 'definitions'

const actorsRequired = {
  user_new_follower: true,
  article_published: false,
  article_new_downstream: true,
  article_new_appreciation: true,
  article_new_subscriber: true,
  article_new_comment: true,
  article_mentioned_you: true,
  subscribed_article_new_comment: true,
  upstream_article_archived: false,
  downstream_article_archived: false,
  comment_pinned: true,
  comment_new_reply: true,
  comment_new_upvote: true,
  comment_mentioned_you: true,
  official_announcement: false
}
const entitiesRequired = {
  user_new_follower: false,
  article_published: true,
  article_new_downstream: true,
  article_new_appreciation: true,
  article_new_subscriber: true,
  article_new_comment: true,
  article_mentioned_you: true,
  subscribed_article_new_comment: true,
  upstream_article_archived: true,
  downstream_article_archived: true,
  comment_pinned: true,
  comment_new_reply: true,
  comment_new_upvote: true,
  comment_mentioned_you: true,
  official_announcement: false
}
const messageRequired = {
  user_new_follower: false,
  article_published: false,
  article_new_downstream: false,
  article_new_appreciation: false,
  article_new_subscriber: false,
  article_new_comment: false,
  article_mentioned_you: false,
  subscribed_article_new_comment: false,
  upstream_article_archived: false,
  downstream_article_archived: false,
  comment_pinned: false,
  comment_new_reply: false,
  comment_new_upvote: false,
  comment_mentioned_you: false,
  official_announcement: true
}

type NoticeEdges = { node: NoticeItem; cursor: string }[]
export const filterMissingFieldNoticeEdges = (
  edges: NoticeEdges
): NoticeEdges => {
  return edges.filter(({ node: notice }) => {
    const noticeType = notice.type
    // check actors
    if (actorsRequired[noticeType] && _.isEmpty(notice.actors)) {
      return false
    }
    // check entities
    if (entitiesRequired[noticeType] && _.isEmpty(notice.entities)) {
      return false
    }
    // check message
    if (messageRequired[noticeType] && _.isEmpty(notice.message)) {
      return false
    }

    return true
  })
}

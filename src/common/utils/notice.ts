import _ from 'lodash'

import { NoticeItem } from 'definitions'

const actorsRequired = {
  user_new_follower: true,
  article_published: false,
  article_new_downstream: true,
  article_new_collected: true,
  article_new_appreciation: true,
  article_new_subscriber: true,
  article_new_comment: true,
  article_mentioned_you: true,
  subscribed_article_new_comment: true,
  upstream_article_archived: false,
  downstream_article_archived: false,
  comment_pinned: true,
  comment_new_reply: true,
  comment_mentioned_you: true,
  official_announcement: false,
  article_tag_has_been_added: true,
  article_tag_has_been_removed: true,
  article_tag_has_been_unselected: true,
  payment_received_donation: true,
  payment_payout: false,
  tag_adoption: true,
  tag_leave: true,
  tag_add_editor: true,
  tag_leave_editor: true,
  revised_article_published: false,
  revised_article_not_published: false,
}
const entitiesRequired = {
  user_new_follower: false,
  article_published: true,
  article_new_downstream: true,
  article_new_collected: true,
  article_new_appreciation: true,
  article_new_subscriber: true,
  article_new_comment: true,
  article_mentioned_you: true,
  subscribed_article_new_comment: true,
  upstream_article_archived: true,
  downstream_article_archived: true,
  comment_pinned: true,
  comment_new_reply: true,
  comment_mentioned_you: true,
  official_announcement: false,
  article_tag_has_been_added: true,
  article_tag_has_been_removed: true,
  article_tag_has_been_unselected: true,
  payment_received_donation: true,
  payment_payout: true,
  tag_adoption: true,
  tag_leave: true,
  tag_add_editor: true,
  tag_leave_editor: true,
  revised_article_published: true,
  revised_article_not_published: true,
}
const messageRequired = {
  user_new_follower: false,
  article_published: false,
  article_new_downstream: false,
  article_new_collected: false,
  article_new_appreciation: false,
  article_new_subscriber: false,
  article_new_comment: false,
  article_mentioned_you: false,
  subscribed_article_new_comment: false,
  upstream_article_archived: false,
  downstream_article_archived: false,
  comment_pinned: false,
  comment_new_reply: false,
  comment_mentioned_you: false,
  official_announcement: true,
  article_tag_has_been_added: false,
  article_tag_has_been_removed: false,
  article_tag_has_been_unselected: false,
  payment_received_donation: false,
  payment_payout: false,
  tag_adoption: false,
  tag_leave: false,
  tag_add_editor: false,
  tag_leave_editor: false,
  revised_article_published: false,
  revised_article_not_published: false,
}

type NoticeEdges = Array<{ node: NoticeItem; cursor: string }>
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

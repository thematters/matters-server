import _ from 'lodash'

import { DBNoticeType, NoticeItem } from 'definitions'

const actorsRequired: Partial<Record<DBNoticeType, boolean>> = {
  article_published: false,
  official_announcement: false,
  payment_payout: false,
  revised_article_published: false,
  revised_article_not_published: false,
}

const entitiesRequired: Partial<Record<DBNoticeType, boolean>> = {
  user_new_follower: false,
  official_announcement: false,
}

const messageRequired: Partial<Record<DBNoticeType, boolean>> = {
  official_announcement: true,
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

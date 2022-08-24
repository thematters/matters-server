import _ from 'lodash'

import { DBNoticeType, NoticeItem } from 'definitions'

const actorsOptional: Partial<Record<DBNoticeType, boolean>> = {
  article_published: true,
  official_announcement: true,
  payment_payout: true,
  revised_article_published: true,
  revised_article_not_published: true,
  circle_new_article: true,
  crypto_wallet_airdrop: true,
  crypto_wallet_connected: true,
}

const entitiesOptional: Partial<Record<DBNoticeType, boolean>> = {
  user_new_follower: true,
  official_announcement: true,
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
    if (!actorsOptional[noticeType] && _.isEmpty(notice.actors)) {
      return false
    }

    // check entities
    if (!entitiesOptional[noticeType] && _.isEmpty(notice.entities)) {
      return false
    }

    // check message
    if (messageRequired[noticeType] && _.isEmpty(notice.message)) {
      return false
    }

    return true
  })
}

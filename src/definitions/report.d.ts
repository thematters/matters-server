import { NODE_TYPES } from '#common/enums/index.js'

export type ReportType =
  | NODE_TYPES.Article
  | NODE_TYPES.Comment
  | NODE_TYPES.Moment

export type ReportReason =
  | 'tort'
  | 'illegal_advertising'
  | 'discrimination_insult_hatred'
  | 'pornography_involving_minors'
  | 'other'
  | 'community_watch_porn_ad'
  | 'community_watch_spam_ad'

export type ReportSource = 'direct' | 'community_watch'

export interface Report {
  id: string
  reporterId: string
  articleId?: string
  commentId?: string
  momentId?: string
  reason: ReportReason
  createdAt: Date
  /**
   * Whether this Report row came from the `report` table or was synthesised
   * from a `community_watch_action` row. Set by resolvers, not stored in DB.
   */
  source?: ReportSource
}

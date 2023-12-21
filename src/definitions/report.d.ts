import { NODE_TYPES } from 'common/enums'

export type ReportType = NODE_TYPES.Article | NODE_TYPES.Comment

export type ReportReason =
  | 'tort'
  | 'illegal_advertising'
  | 'discrimination_insult_hatred'
  | 'pornography_involving_minors'
  | 'other'

export interface Report {
  id: string
  userId: string
  articleId?: string
  commentId?: string
  reason: ReportReason
  createdAt: Date
}

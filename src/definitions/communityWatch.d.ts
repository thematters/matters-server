import type { COMMENT_STATE } from '#common/enums/index.js'
import type { ValueOf } from './generic.js'

export type CommunityWatchActionReason = 'porn_ad' | 'spam_ad'
export type CommunityWatchActionState = 'active' | 'restored' | 'voided'
export type CommunityWatchAppealState = 'none' | 'received' | 'resolved'
export type CommunityWatchReviewState =
  | 'pending'
  | 'upheld'
  | 'reversed'
  | 'reason_adjusted'

export interface CommunityWatchAction {
  id: string
  uuid: string
  commentId: string
  commentType: 'article' | 'moment'
  targetType: 'article' | 'moment'
  targetId: string
  targetTitle: string | null
  targetShortHash: string | null
  reason: CommunityWatchActionReason
  actorId: string
  commentAuthorId: string | null
  originalContent: string | null
  originalState: ValueOf<typeof COMMENT_STATE>
  actionState: CommunityWatchActionState
  appealState: CommunityWatchAppealState
  reviewState: CommunityWatchReviewState
  reviewerId: string | null
  reviewNote: string | null
  reviewedAt: Date | null
  contentExpiresAt: Date
  createdAt: Date
  updatedAt: Date
}

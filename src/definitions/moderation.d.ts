export type ModerationCaseSource =
  | 'direct_report'
  | 'community_watch'
  | 'admin'
  | 'system'
  | 'model_assisted'
  | 'automated'

export type ModerationTargetType =
  | 'article'
  | 'comment'
  | 'moment'
  | 'user'
  | 'tag'
  | 'other'

export type ModerationCaseStatus =
  | 'received'
  | 'reviewing'
  | 'action_taken'
  | 'rejected'
  | 'appealed'
  | 'resolved'
  | 'closed'

export type ModerationCaseOutcome =
  | 'no_action'
  | 'content_collapsed'
  | 'content_hidden'
  | 'content_removed'
  | 'account_limited'
  | 'restored'
  | 'partially_restored'
  | 'upheld'

export type ModerationAutomationRole =
  | 'none'
  | 'suggested'
  | 'assisted'
  | 'automated'

export type ModerationNoticeState =
  | 'not_required'
  | 'pending'
  | 'sent'
  | 'delayed'
  | 'prohibited'
  | 'failed'

export type ModerationEventType =
  | 'created'
  | 'notified'
  | 'reviewed'
  | 'actioned'
  | 'appealed'
  | 'restored'
  | 'closed'
  | 'exported'

export type ModerationActorType =
  | 'user'
  | 'community_watcher'
  | 'admin'
  | 'system'
  | 'model'

export interface ModerationCase {
  id: string
  source: ModerationCaseSource
  targetType: ModerationTargetType
  targetId: string
  primaryReporterId: string | null
  reason: string
  publicReason: string | null
  status: ModerationCaseStatus
  outcome: ModerationCaseOutcome | null
  automationRole: ModerationAutomationRole
  modelName: string | null
  modelVersion: string | null
  noticeState: ModerationNoticeState
  resolvedAt: Date | null
  closedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface ModerationCaseReporter {
  id: string
  caseId: string
  reporterId: string
  reportId: string | null
  reportedAt: Date
}

export interface ModerationEvent {
  id: string
  caseId: string
  eventType: ModerationEventType
  actorType: ModerationActorType
  actorId: string | null
  publicReason: string | null
  internalNote: string | null
  fromStatus: ModerationCaseStatus | null
  toStatus: ModerationCaseStatus | null
  fromOutcome: ModerationCaseOutcome | null
  toOutcome: ModerationCaseOutcome | null
  metadata: Record<string, unknown> | null
  createdAt: Date
}

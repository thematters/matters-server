export type SpamRingStatus = 'pending' | 'frozen' | 'dismissed' | 'restored'
export type SpamRingMemberStatus = 'pending' | 'frozen' | 'skipped' | 'restored'
export type SpamRingSeverity = 'low' | 'medium' | 'high' | 'critical'
export type SpamRingEventAction =
  | 'detected'
  | 'frozen'
  | 'unfrozen'
  | 'dismissed'
  | 'member_banned'
  | 'member_frozen'
  | 'member_skipped'
  | 'member_restored'

// app 層精修訊號摘要（偵測 job 寫入；snake_case 鍵存 jsonb，GraphQL 層轉 camelCase）
export interface SpamRingSignals {
  nearDupRingSize?: number | null
  entityRingSize?: number | null
  botUsernameRatio?: number | null
  topEntity?: string | null
  sampleCodes?: string[] | null
  sampleBrands?: string[] | null
  sampleTexts?: string[] | null
  contentModelMax?: number | null
}

export interface SpamRing {
  id: string
  uuid: string
  fingerprint: string
  status: SpamRingStatus
  signals: SpamRingSignals
  nArticles: number
  nAuthors: number
  newAccountRatio: number | null
  score: number | null
  severity: SpamRingSeverity | null
  detectedAt: Date
  firstSeenAt: Date | null
  lastSeenAt: Date | null
  frozenAt: Date | null
  frozenBy: string | null
  note: string | null
  createdAt: Date
  updatedAt: Date
}

export interface SpamRingMember {
  id: string
  uuid: string
  ringId: string
  userId: string
  status: SpamRingMemberStatus
  bannedByThisRing: boolean
  skipReason: string | null
  preFreezeState: 'active' | 'banned' | 'archived' | 'frozen' | null
  evidence: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

export interface SpamRingEvent {
  id: string
  uuid: string
  ringId: string
  memberId: string | null
  actorId: string | null
  action: SpamRingEventAction
  detail: Record<string, any>
  createdAt: Date
}

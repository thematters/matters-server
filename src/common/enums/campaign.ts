export const CAMPAIGN_TYPE = {
  writingChallenge: 'writing_challenge',
} as const

export const CAMPAIGN_STATE = {
  pending: 'pending',
  active: 'active',
  finished: 'finished',
  archived: 'archived',
} as const

export const CAMPAIGN_USER_STATE = {
  pending: 'pending',
  succeeded: 'succeeded',
  rejected: 'rejected',
} as const

export const CAMPAIGNS_FILTER_SORT = {
  writingPeriod: 'writing_period',
}

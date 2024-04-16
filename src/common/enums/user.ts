import { isProd } from 'common/environment'

export const USER_STATE = {
  frozen: 'frozen',
  active: 'active',
  banned: 'banned',
  archived: 'archived',
} as const

export const USER_BAN_REMARK = {
  payoutReversedByAdmin: 'payout reversed by admin',
  paymentHighRisk: 'payment high risk',
} as const

export const AUTHOR_TYPE = {
  active: 'active',
  appreciated: 'appreciated',
  default: 'default',
  trendy: 'trendy',
} as const

export const PUBLISH_ARTICLE_RATE_LIMIT = isProd ? 1 : 1000
export const PUBLISH_ARTICLE_RATE_PERIOD = 720 // for 12 minutes;

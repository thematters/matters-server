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

import { MINUTE } from './time'

export const VERIFICATION_CODE_STATUS = {
  active: 'active',
  inactive: 'inactive',
  verified: 'verified',
  expired: 'expired',
  used: 'used',
}

export const VERIFICATION_CODE_TYPES = {
  register: 'register',
  email_reset: 'email_reset',
  email_reset_confirm: 'email_reset_confirm',
  password_reset: 'password_reset',
  payment_password_reset: 'payment_password_reset',
}

export const VERIFICATION_CODE_PROTECTED_TYPES = [
  'email_reset',
  'email_reset_confirm',
  'payment_password_reset',
]

export const VERIFICATION_CODE_EXIPRED_AFTER = MINUTE * 5 // 5 mins

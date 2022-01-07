import { DAY, MINUTE } from './time'

export enum VERIFICATION_CODE_STATUS {
  active = 'active',
  inactive = 'inactive',
  verified = 'verified',
  expired = 'expired',
  used = 'used',
}

export const VERIFICATION_CODE_PROTECTED_TYPES = [
  'email_reset',
  'email_reset_confirm',
  'payment_password_reset',
]

export const VERIFICATION_CODE_EXIPRED_AFTER = MINUTE * 5 // 5 mins

export const CIRCLE_INVITATION_VERIFICATION_CODE_EXPIRED_AFTER = DAY * 180 // 6 months

export const VERIFICATION_DOMAIN_WHITELIST = ['matters.news']

export enum CRYPTO_WALLET_SIGNATURE_STATUS {
  active = 'active',
  inactive = 'inactive',
  // verified = 'verified',
  expired = 'expired',
  used = 'used',
}

export const LOGGING_LEVEL = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const

export const LOGGING_CONTEXT_KEY = {
  requestId: 'requestId',
} as const

export const AUDIT_LOG_ACTION = {
  updateEmail: 'update_email',
  updatePassword: 'update_password',
  updateUsername: 'update_username',
  updateDisplayName: 'update_display_name',
  removeSocialAccount: 'remove_social_account',
  addWallet: 'add_wallet',
  removeWallet: 'remove_wallet',
  socialLogin: 'social_login',
  socialSignup: 'social_signup',
  addSocialAccount: 'add_social_account',
  emailLogin: 'email_login',
  emailLoginOTP: 'email_login_otp',
  emailSignup: 'email_signup',
  emailSignupOTP: 'email_signup_otp',
  walletLogin: 'wallet_login',
  walletSignup: 'wallet_signup',
} as const

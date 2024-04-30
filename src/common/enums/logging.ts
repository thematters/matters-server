export const LOGGING_LEVEL = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const

export const LOGGING_CONTEXT_KEY = {
  requestId: 'requestId',
  ip: 'ip',
  userAgent: 'userAgent',
} as const

export const AUDIT_LOG_ACTION = {
  updateEmail: 'update_email',
  updatePassword: 'update_password',
  updateUsername: 'update_username',
  updateDisplayName: 'update_display_name',
  removeSocialAccountGoogle: 'remove_social_account_google',
  removeSocialAccountTwitter: 'remove_social_account_twitter',
  removeSocialAccountFacebook: 'remove_social_account_facebook',
  addWallet: 'add_wallet',
  addWalletAfterDonation: 'add_wallet_after_donation',
  removeWallet: 'remove_wallet',
  socialLoginGoogle: 'social_login_google',
  socialSignupGoogle: 'social_signup_google',
  socialLoginTwitter: 'social_login_twitter',
  socialSignupTwitter: 'social_signup_twitter',
  socialLoginFacebook: 'social_login_facebook',
  socialSignupFacebook: 'social_signup_facebook',
  addSocialAccountGoogle: 'add_social_account_google',
  addSocialAccountTwitter: 'add_social_account_twitter',
  addSocialAccountFacebook: 'add_social_account_facebook',
  emailLogin: 'email_login',
  emailLoginOTP: 'email_login_otp',
  emailSignup: 'email_signup',
  emailSignupOTP: 'email_signup_otp',
  walletLogin: 'wallet_login',
  walletSignup: 'wallet_signup',
  createCollection: 'create_collection',
  removeCollection: 'remove_collection',
  addArticleIntoCollection: 'add_article_into_collection',
  removeArticleFromCollection: 'remove_article_from_collection',
} as const

export const AUDIT_LOG_STATUS = {
  pending: 'pending',
  succeeded: 'succeeded',
  failed: 'failed',
} as const

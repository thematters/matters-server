export const RESET_PASSWORD_TYPE = {
  account: 'account',
  payment: 'payment',
} as const

export const AUTH_RESULT_TYPE = {
  Login: 'Login',
  Signup: 'Signup',
  LinkAccount: 'LinkAccount',
} as const

export const SIGNING_MESSAGE_PURPOSE = {
  airdrop: 'airdrop',
  connect: 'connect',
  signup: 'signup',
  login: 'login',
  claimLogbook: 'claimLogbook',
} as const

export const SOCIAL_LOGIN_TYPE = {
  Google: 'Google',
  Twitter: 'Twitter',
  Facebook: 'Facebook',
} as const

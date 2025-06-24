import { isProd } from '../environment.js'

export const MINUTE = 1000 * 60
export const HOUR = MINUTE * 60
export const DAY = HOUR * 24
export const MONTH = DAY * 30
export const SERVER_TIMEOUT = 5 * MINUTE

export const COOKIE_EXPIRES_IN_MS = DAY * 90 // 90 days

export const USER_ACCESS_TOKEN_EXPIRES_IN_MS = isProd ? HOUR : 15 * MINUTE // 1 hour for prod, 15 mins for dev (short-lived)
export const USER_REFRESH_TOKEN_EXPIRES_IN_MS = DAY * 30 // 30 days (long-lived)

export const OAUTH_AUTHORIZATION_TOKEN_EXPIRES_IN_MS = MINUTE * 10 // 10 mins
export const OAUTH_ACCESS_TOKEN_EXPIRES_IN_MS = DAY * 30 // 30 days
export const OAUTH_REFRESH_TOKEN_EXPIRES_IN_MS = DAY * 90 // 90 days

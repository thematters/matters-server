import type { User } from '#definitions/index.js'

import {
  COOKIE_LANGUAGE,
  COOKIE_ACCESS_TOKEN_NAME,
  COOKIE_REFRESH_TOKEN_NAME,
  COOKIE_USER_GROUP,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
  USER_REFRESH_TOKEN_EXPIRES_IN_MS,
} from '#common/enums/index.js'
import { isTest } from '#common/environment.js'
import { extractRootDomain, getUserGroup } from '#common/utils/index.js'
import { CookieOptions, Request, Response } from 'express'

/**
 * Provides standardized cookie configuration with security best practices:
 * - httpOnly: Prevents JavaScript access to sensitive cookies
 * - secure: Ensures cookies are only sent over HTTPS
 * - domain: Controls cross-subdomain accessibility
 * - sameSite: Manages cross-site request behavior
 */
const getCookieOptions = ({
  req,
  maxAge = USER_ACCESS_TOKEN_EXPIRES_IN_MS,
}: {
  req: Request
  maxAge?: number
}): CookieOptions => {
  // e.g. server.matters.town
  const hostname = req.hostname
  const tld = extractRootDomain(hostname) // e.g. matters.town

  // Add dot prefix to enable cookie sharing across subdomains
  // This allows cookies to be accessible by both matters.town (Next.js SSR)
  // and server.matters.town (API server)
  const domain = `.${tld}`

  // Local env needs SameSite=None for cross-origin functionality
  // Development & production envs use SameSite=Lax for
  // security while allowing cookies on navigation
  const localOrigin = /(localhost|127\.0\.0\.1)(:\d+)?$/.test(
    req.headers.origin || ''
  )
  const isVercelPreview = hostname.includes('.vercel.app')

  return {
    maxAge,
    httpOnly: true,
    secure: true,
    ...(localOrigin || isVercelPreview ? {} : { domain }), // Only set domain if it's defined
    sameSite: localOrigin || isVercelPreview ? 'none' : 'lax',
  }
}

/**
 * Sets authentication and user preference cookies with appropriate security settings.
 *
 * Cookie design addresses several requirements:
 * 1. Cross-subdomain sharing: API (server.matters.town) and website (matters.town)
 *    need to share cookies for Next.js SSR authentication
 * 2. Development flexibility: Local environments need special handling
 * 3. Security: Cookies use httpOnly and secure flags
 * 4. CSRF protection: Uses SameSite=Lax in production
 */
export const setCookie = ({
  req,
  res,
  accessToken,
  refreshToken,
  user,
}: {
  req: Request
  res: Response
  accessToken?: string
  refreshToken?: string
  user: User
}) => {
  if (isTest) {
    // skip during testing
    return
  }

  // cookie:accessToken - Contains user authentication JWT (1 hour)
  if (accessToken) {
    const accessCookieOptions = getCookieOptions({
      req,
      maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    })
    res.cookie(COOKIE_ACCESS_TOKEN_NAME, accessToken, accessCookieOptions)
  }

  // cookie:refreshToken - Contains refresh token (30 days)
  if (refreshToken) {
    const refreshCookieOptions = getCookieOptions({
      req,
      maxAge: USER_REFRESH_TOKEN_EXPIRES_IN_MS,
    })
    res.cookie(COOKIE_REFRESH_TOKEN_NAME, refreshToken, refreshCookieOptions)
  }

  // cookie:user_group - Used for feature targeting and analytics
  const baseCookieOptions = getCookieOptions({ req })
  res.cookie(COOKIE_USER_GROUP, getUserGroup(user), baseCookieOptions)

  // cookie:language - Stores user language preference
  res.cookie(COOKIE_LANGUAGE, user.language, baseCookieOptions)
}

/**
 * Properly clears authentication cookies using the same settings
 * used when creating them, which is required for cookie removal to work.
 *
 * Note: Language cookies could be preserved for anonymous users in future.
 */
export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  // Must use same cookie options when clearing as when setting
  // clearCookie needs matching domain and path values
  const cookieOptions = getCookieOptions({ req })

  // cookie:token
  res.clearCookie(COOKIE_ACCESS_TOKEN_NAME, cookieOptions)

  // cookie:refreshToken
  res.clearCookie(COOKIE_REFRESH_TOKEN_NAME, cookieOptions)

  // cookie:user_group
  res.clearCookie(COOKIE_USER_GROUP, cookieOptions)
}

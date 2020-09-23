import { CookieOptions, Request, Response } from 'express'

import {
  COOKIE_TOKEN_NAME,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
} from 'common/enums'
import { isTest } from 'common/environment'

const getCookieOption = (req: Request) => {
  const origin = req.headers.origin || ''
  const isLocalDev = /(localhost|127\.0\.0\.1):\d+$/.test(origin)

  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly: true,
    secure: req.protocol === 'https',
    domain: req.hostname,
    sameSite: isLocalDev ? undefined : 'strict',
  } as CookieOptions
}

export const setCookie = ({
  req,
  res,
  token,
}: {
  req: Request
  res: Response
  token: string
}) => {
  if (isTest) {
    // skip during testing
    return
  }

  const opts = getCookieOption(req)
  return res.cookie(COOKIE_TOKEN_NAME, token, opts)
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  const opts = getCookieOption(req)
  return res.clearCookie(COOKIE_TOKEN_NAME, opts)
}

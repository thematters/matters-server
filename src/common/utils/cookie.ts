import { CookieOptions, Request, Response } from 'express'
import psl from 'psl'

import {
  COOKIE_LANGUAGE,
  COOKIE_TOKEN_NAME,
  COOKIE_USER_GROUP,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
} from 'common/enums'
import { isTest } from 'common/environment'
import { getUserGroup } from 'common/utils'

const getCookieOption = ({
  req,
  httpOnly,
  publicSuffix,
  sameSite,
}: {
  req: Request
  httpOnly?: boolean
  publicSuffix?: boolean
  sameSite: boolean | 'strict' | 'lax' | 'none' | undefined
}) => {
  const origin = req.headers.origin || ''
  const isLocalDev =
    /(localhost|127\.0\.0\.1):\d+$/.test(origin) ||
    /githubpreview\.dev$/.test(origin) ||
    /\.vercel\.app$/.test(origin)
  const domain =
    publicSuffix && !isLocalDev ? psl.get(req.hostname) : req.hostname

  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly,
    secure: true,
    domain,
    sameSite: isLocalDev ? 'none' : sameSite,
  } as CookieOptions
}

export const setCookie = ({
  req,
  res,
  token,
  user,
}: {
  req: Request
  res: Response
  token: string
  user: any
}) => {
  if (isTest) {
    // skip during testing
    return
  }

  res.cookie(
    COOKIE_TOKEN_NAME,
    token,
    getCookieOption({ req, httpOnly: true, sameSite: 'strict' })
  )
  res.cookie(
    COOKIE_USER_GROUP,
    getUserGroup(user),
    getCookieOption({
      req,
      httpOnly: false,
      publicSuffix: true,
      sameSite: 'lax',
    })
  )
  res.cookie(
    COOKIE_LANGUAGE,
    user.language,
    getCookieOption({
      req,
      httpOnly: false,
      publicSuffix: true,
      sameSite: 'lax',
    })
  )
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  res.clearCookie(
    COOKIE_TOKEN_NAME,
    getCookieOption({ req, httpOnly: true, sameSite: 'strict' })
  )
  res.clearCookie(
    COOKIE_USER_GROUP,
    getCookieOption({
      req,
      httpOnly: false,
      publicSuffix: true,
      sameSite: 'lax',
    })
  )

  // TBD: keep it for anonymous language setting
  // res.clearCookie(
  //   COOKIE_LANGUAGE,
  //   getCookieOption({
  //     req,
  //     httpOnly: false,
  //     publicSuffix: true,
  //     sameSite: 'lax',
  //   })
  // )
}

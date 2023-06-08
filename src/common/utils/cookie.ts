import { CookieOptions, Request, Response } from 'express'

import {
  COOKIE_LANGUAGE,
  COOKIE_TOKEN_NAME,
  COOKIE_USER_GROUP,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
} from 'common/enums'
import { isProd, isTest } from 'common/environment'
import { extractRootDomain, getUserGroup } from 'common/utils'

const isDevOrigin = (url: string) =>
  /(localhost|127\.0\.0\.1)(:\d+)?$/.test(url) || /\.vercel\.app$/.test(url)

const getCookieOption = ({
  req,
  httpOnly,
  sameSite,
  domain,
}: {
  req: Request
  httpOnly?: boolean
  sameSite?: boolean | 'strict' | 'lax' | 'none'
  domain?: string
}) =>
  ({
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly,
    secure: true,
    domain,
    sameSite,
  } as CookieOptions)

export const setCookie = ({
  req,
  res,
  token,
  user,
}: {
  req: Request
  res: Response
  token?: string
  user: any
}) => {
  if (isTest) {
    // skip during testing
    return
  }

  // e.g. server.matters.news / server-develop.matters.news
  const hostname = req.hostname
  const tld = extractRootDomain(hostname) // matters.news
  const domain = isProd ? tld : hostname

  // e.g. *.vercel.app / localhost
  const devOrigin = isDevOrigin(req.headers.origin || '')

  // cookie:token
  if (token) {
    res.cookie(
      COOKIE_TOKEN_NAME,
      token,
      getCookieOption({
        req,
        domain,
        httpOnly: true,
        sameSite: devOrigin ? 'none' : 'lax',
      })
    )
  }

  // cookie:user group
  res.cookie(
    COOKIE_USER_GROUP,
    getUserGroup(user),
    getCookieOption({
      req,
      domain,
      httpOnly: true,
      sameSite: devOrigin ? 'none' : 'lax',
    })
  )

  // cookie:language
  res.cookie(
    COOKIE_LANGUAGE,
    user.language,
    getCookieOption({
      req,
      domain,
      httpOnly: true,
      sameSite: devOrigin ? 'none' : 'lax',
    })
  )
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  // e.g. server.matters.news / server-develop.matters.news
  const hostname = req.hostname
  const tld = extractRootDomain(hostname) // matters.news
  const domain = isProd ? tld : hostname

  // e.g. *.vercel.app / localhost
  const devOrigin = isDevOrigin(req.headers.origin || '')

  // cookie:token
  res.clearCookie(
    COOKIE_TOKEN_NAME,
    getCookieOption({
      req,
      domain,
      httpOnly: true,
      sameSite: devOrigin ? 'none' : 'lax',
    })
  )

  // cookie:user group
  res.clearCookie(
    COOKIE_USER_GROUP,
    getCookieOption({
      req,
      domain,
      httpOnly: true,
      sameSite: devOrigin ? 'none' : 'lax',
    })
  )

  // TBD: keep language cookies for anonymous language settings
}

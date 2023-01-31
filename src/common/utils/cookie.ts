import { CookieOptions, Request, Response } from 'express'

import {
  COOKIE_LANGUAGE,
  COOKIE_TOKEN_NAME,
  COOKIE_USER_GROUP,
  USER_ACCESS_TOKEN_EXPIRES_IN_MS,
} from 'common/enums'
import { isTest } from 'common/environment'
import { getUserGroup } from 'common/utils'

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
}) => {
  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly,
    secure: true,
    domain,
    sameSite,
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
  token?: string
  user: any
}) => {
  if (isTest) {
    // skip during testing
    return
  }

  // e.g. server.matters.news / web-develop.matters.news
  const hostname = req.hostname

  // e.g. web-develop.matters.news / *.vercel.app / localhost
  const devOrigin = isDevOrigin(req.headers.origin || '')

  // cookie:token
  if (token) {
    res.cookie(
      COOKIE_TOKEN_NAME,
      token,
      getCookieOption({
        req,
        domain: hostname,
        httpOnly: true,
        sameSite: devOrigin ? 'none' : 'strict',
      })
    )
  }

  // cookie:user group
  res.cookie(
    COOKIE_USER_GROUP,
    getUserGroup(user),
    getCookieOption({
      req,
      domain: hostname,
      httpOnly: false,
      sameSite: devOrigin ? 'none' : 'strict',
    })
  )

  // cookie:language
  res.cookie(
    COOKIE_LANGUAGE,
    user.language,
    getCookieOption({
      req,
      domain: hostname,
      httpOnly: false,
      sameSite: devOrigin ? 'none' : 'strict',
    })
  )
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  // e.g. server.matters.news / web-develop.matters.news
  const hostname = req.hostname

  // e.g. web-develop.matters.news / *.vercel.app / localhost
  const devOrigin = isDevOrigin(req.headers.origin || '')

  // cookie:token
  res.clearCookie(
    COOKIE_TOKEN_NAME,
    getCookieOption({
      req,
      domain: hostname,
      httpOnly: true,
      sameSite: devOrigin ? 'none' : 'strict',
    })
  )

  // cookie:user group
  res.clearCookie(
    COOKIE_USER_GROUP,
    getCookieOption({
      req,
      domain: hostname,
      httpOnly: false,
      sameSite: devOrigin ? 'none' : 'strict',
    })
  )

  // TBD: keep language cookies for anonymous language settings
}

import { Response } from 'express'
import psl from 'psl'

import { USER_ACCESS_TOKEN_EXPIRES_IN } from 'common/enums'
import { environment } from 'common/environment'

const getCookieOption = () => {
  let domain: string
  if (environment.env === 'development') {
    domain = ''
  } else {
    domain = `.${psl.get(environment.domain || 'matters.news')}`
  }

  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN,
    httpOnly: true,
    domain
  }
}

export const setCookie = ({ res, token }: { res: Response; token: string }) => {
  if (environment.env === 'test') {
    // skip during testing
    return
  }

  const opts = getCookieOption()
  return res.cookie('token', token, opts)
}

export const clearCookie = (res: Response) => {
  const opts = getCookieOption()
  return res.clearCookie('token', opts)
}

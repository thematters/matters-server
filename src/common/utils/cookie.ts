import { Request, Response } from 'express'
import psl from 'psl'

import { USER_ACCESS_TOKEN_EXPIRES_IN_MS } from 'common/enums'
import { environment } from 'common/environment'

const getCookieOption = () => {
  const domain =
    environment.env === 'development'
      ? ''
      : `.${psl.get(environment.domain || 'matters.news')}`

  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly: true,
    // secure:
    domain,
  }
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
  if (environment.env === 'test') {
    // skip during testing
    return
  }

  const opts = getCookieOption()
  return res.cookie('token', token, opts)
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  const opts = getCookieOption()
  return res.clearCookie('token', opts)
}

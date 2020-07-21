import { Request, Response } from 'express'

import { USER_ACCESS_TOKEN_EXPIRES_IN_MS } from 'common/enums'
import { environment } from 'common/environment'

const getCookieOption = (req: Request) => {
  return {
    maxAge: USER_ACCESS_TOKEN_EXPIRES_IN_MS,
    httpOnly: true,
    secure: req.protocol === 'https',
    domain: req.hostname,
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

  const opts = getCookieOption(req)
  return res.cookie('token', token, opts)
}

export const clearCookie = ({ req, res }: { req: Request; res: Response }) => {
  const opts = getCookieOption(req)
  return res.clearCookie('token', opts)
}

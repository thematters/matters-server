import { Response } from 'express'
import psl from 'psl'
import { environment } from 'common/environment'

export const setCookie = ({
  res,
  token,
  expiresIn
}: {
  res: Response
  token: string
  expiresIn: number
}) => {
  if (environment.env === 'test') {
    // skip during testing
    return
  }

  let domain
  if (environment.env === 'develop') {
    domain = ''
  } else {
    domain = `.${psl.get(environment.domain || 'matters.news')}`
  }

  return res.cookie('token', token, {
    maxAge: expiresIn,
    httpOnly: true,
    domain
  })
}
